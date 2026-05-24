from fastapi import FastAPI, UploadFile, File, HTTPException
import tempfile
import os
import shutil
from utils import predict_distress, predict_yamnet

app = FastAPI(title="NirapodAI ML Backend")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "NirapodAI ML Backend is running."}

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyzes an uploaded audio file using the dual-model pipeline:
    1. YAMNet for contextual/safe sound detection
    2. Custom CNN for distress/scream detection
    """
    if not file.filename.endswith(('.wav', '.mp3', '.ogg', '.flac', '.m4a', '.mp4', '.aac', '.3gp')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a valid audio file.")
        
    temp_path = None
    try:
        # Save uploaded file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_audio:
            shutil.copyfileobj(file.file, temp_audio)
            temp_path = temp_audio.name
            
        # 1. Run YAMNet
        yamnet_scores = predict_yamnet(temp_path)
        
        # 2. Run Custom Distress CNN
        label, confidence = predict_distress(temp_path)
        
        is_scream = label.lower() in ["scream", "aggression", "cry"]
        
        # Fusion Logic
        SAFE_HUMAN_SOUNDS = [
            "Laughter", "Baby laughter", "Giggle", "Snicker", "Belly laugh", 
            "Chuckle, chortle", "Cheering", "Singing", "Child singing", 
            "Synthetic singing"
        ]
        
        DISTRESS_SOUNDS = [
            "Screaming", "Crying, sobbing", "Baby cry, infant cry", 
            "Wail, moan", "Shout", "Yell", "Children shouting"
        ]
        
        overridden_by_yamnet = False
        safe_sound_score = sum(yamnet_scores.get(sound, 0.0) for sound in SAFE_HUMAN_SOUNDS)
        distress_score = sum(yamnet_scores.get(sound, 0.0) for sound in DISTRESS_SOUNDS)
        
        yamnet_class = max(yamnet_scores, key=yamnet_scores.get)
        yamnet_score = yamnet_scores[yamnet_class]
        
        if is_scream and safe_sound_score > 0.05 and safe_sound_score > (distress_score * 1.5):
            is_scream = False
            overridden_by_yamnet = True
            best_safe_class = max(SAFE_HUMAN_SOUNDS, key=lambda s: yamnet_scores.get(s, 0.0))
            yamnet_class = best_safe_class
            yamnet_score = safe_sound_score
            
        return {
            "status": "SCREAM" if is_scream else "SAFE",
            "overridden_by_yamnet": overridden_by_yamnet,
            "cnn_prediction": {
                "label": label,
                "confidence": float(confidence)
            },
            "yamnet_context": {
                "top_class": yamnet_class,
                "confidence": float(yamnet_score),
                "safe_score_aggregate": float(safe_sound_score),
                "distress_score_aggregate": float(distress_score)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
