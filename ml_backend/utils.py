import os
import librosa
import numpy as np
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder

# Initialize labels manually to handle 4 classes without crashing
LABELS = {
    0: "aggression",
    1: "cry",
    2: "neutral",
    3: "scream"
}

_model = None

import csv
import tensorflow as tf

def get_model():
    """Lazy load the custom CNN TFLite model to speed up startup/imports and handle path dynamically."""
    global _model
    if _model is None:
        model_path = os.path.join(os.path.dirname(__file__), "models", "distress_end2end.tflite")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        _model = tf.lite.Interpreter(model_path=model_path)
        _model.allocate_tensors()
    return _model

_yamnet_interpreter = None
_yamnet_classes = None

def get_yamnet():
    global _yamnet_interpreter, _yamnet_classes
    if _yamnet_interpreter is None:
        model_path = os.path.join(os.path.dirname(__file__), "models", "yamnet.tflite")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"YAMNet model not found at {model_path}")
        _yamnet_interpreter = tf.lite.Interpreter(model_path=model_path)
        _yamnet_interpreter.allocate_tensors()
        
        class_map_path = os.path.join(os.path.dirname(__file__), "models", "yamnet_class_map.csv")
        _yamnet_classes = []
        if os.path.exists(class_map_path):
            with open(class_map_path, 'r') as csvfile:
                reader = csv.reader(csvfile)
                next(reader) # skip header
                for row in reader:
                    _yamnet_classes.append(row[2])
    return _yamnet_interpreter, _yamnet_classes

def predict_yamnet(audio_path):
    """
    Run YAMNet inference on the audio to get general audio context.
    Chunks the audio into 15600-sample windows (0.975s), runs inference on each,
    and returns a dictionary mapping class name -> mean score.
    """
    audio, sr = librosa.load(audio_path, sr=16000, mono=True)
    
    interpreter, classes = get_yamnet()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    expected_size = input_details[0]['shape'][0]  # Usually 15600

    chunks = []
    for i in range(0, len(audio), expected_size):
        chunk = audio[i:i+expected_size]
        if len(chunk) < expected_size:
            chunk = np.pad(chunk, (0, expected_size - len(chunk)), mode='constant')
        chunks.append(chunk)

    if not chunks:
        chunks.append(np.zeros(expected_size, dtype=np.float32))

    all_scores = []
    for chunk in chunks:
        interpreter.set_tensor(input_details[0]['index'], chunk.astype(np.float32))
        interpreter.invoke()
        scores = interpreter.get_tensor(output_details[0]['index'])
        if len(scores.shape) > 1:
            scores = np.mean(scores, axis=0) # if it returned multiple frames
        all_scores.append(scores)
        
    mean_scores = np.mean(np.vstack(all_scores), axis=0)
    
    # Return dictionary of class -> score
    results = {}
    for idx, score in enumerate(mean_scores):
        if classes and idx < len(classes):
            name = classes[idx]
        else:
            name = f"Class_{idx}"
        results[name] = float(score)
        
    return results

def predict_distress(audio_path):
    """
    Predict distress class (neutral vs scream) and return confidence.
    Now uses the end-to-end model which takes raw waveforms and computes Mel inside TFLite.
    Evaluates in 2-second (32000 sample) chunks and returns the max distress score.
    """
    # Load audio
    audio, sr = librosa.load(audio_path, sr=16000, mono=True)

    # We want to chunk into 2.0 seconds of audio, meaning 32000 samples.
    target_samples = 32000
    
    chunks = []
    for i in range(0, len(audio), target_samples):
        chunk = audio[i:i+target_samples]
        if len(chunk) < target_samples:
            chunk = np.pad(chunk, (0, target_samples - len(chunk)), mode='constant')
        chunks.append(chunk)
        
    if not chunks:
        chunks.append(np.zeros(target_samples, dtype=np.float32))

    # Load model
    interpreter = get_model()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    max_scream_confidence = 0.0
    best_label = "neutral"

    for chunk in chunks:
        # Expand dimensions for model input: (1, 32000)
        waveform = np.expand_dims(chunk, axis=0)
        
        interpreter.set_tensor(input_details[0]['index'], waveform.astype(np.float32))
        interpreter.invoke()
        prediction = interpreter.get_tensor(output_details[0]['index'])

        # Handle output shapes dynamically
        num_classes = prediction.shape[-1]
        
        if num_classes == 1:
            # Binary classification with 1 sigmoid output (predicts probability of index 1: 'scream')
            prob_scream = float(prediction[0][0])
            if prob_scream > max_scream_confidence:
                max_scream_confidence = prob_scream
                best_label = "scream" if prob_scream > 0.5 else "neutral"
        else:
            # Multi-class classification (softmax over 2 or more outputs)
            prob_scream = float(prediction[0][3]) # Index 3 is 'scream' in LABELS
            predicted_class = int(np.argmax(prediction))
            if prob_scream > max_scream_confidence:
                max_scream_confidence = prob_scream
                best_label = LABELS.get(predicted_class, f"unknown_class_{predicted_class}")

    # If it's multi-class, we want to return the highest scream confidence and its corresponding label
    # Even if max_scream_confidence isn't the argmax, the backend will use this confidence for logic
    if max_scream_confidence > 0.5:
        return "scream", max_scream_confidence
    else:
        return best_label, max_scream_confidence
