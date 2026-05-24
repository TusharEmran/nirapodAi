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
        model_path = os.path.join(os.path.dirname(__file__), "models", "logmel2d_best.tflite")
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

def extract_mel_spectrogram(file_path):
    """
    Extract Mel spectrogram from the audio file.
    Resamples to 16000Hz, computes mel spectrogram with 128 mels,
    converts to dB scale, and crops/pads to exactly 128 time frames.
    """
    # Load audio
    audio, sr = librosa.load(
        file_path,
        sr=16000
    )

    # We want exactly 2.0 seconds of audio, meaning 32000 samples.
    # We can truncate or pad the audio.
    target_samples = 32000
    if len(audio) > target_samples:
        audio = audio[:target_samples]
    elif len(audio) < target_samples:
        audio = np.pad(audio, (0, target_samples - len(audio)), mode='constant')

    # Mel spectrogram
    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=sr,
        n_mels=64,
        n_fft=400,
        hop_length=160,
        power=2.0
    )

    # Convert to log-scale decibel values
    mel_db = librosa.power_to_db(
        mel,
        ref=np.max
    ).astype(np.float32)

    # Standardize
    mel_db = (mel_db - mel_db.mean()) / (mel_db.std() + 1e-6)

    # Crop to maximum 201 frames
    mel_db = mel_db[:, :201]

    # Pad if shorter than 201 frames
    if mel_db.shape[1] < 201:
        pad_width = 201 - mel_db.shape[1]
        mel_db = np.pad(
            mel_db,
            pad_width=((0, 0), (0, pad_width)),
            mode='constant'
        )

    return mel_db

def predict_distress(audio_path):
    """
    Predict distress class (neutral vs scream) and return confidence.
    Supports both 2-output softmax and 1-output sigmoid networks.
    """
    spec = extract_mel_spectrogram(audio_path)

    # Expand dimensions for model input: (1, 64, 201, 1)
    spec = np.expand_dims(spec, axis=-1)
    spec = np.expand_dims(spec, axis=0)

    # Load model and predict
    interpreter = get_model()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    interpreter.set_tensor(input_details[0]['index'], spec.astype(np.float32))
    interpreter.invoke()
    prediction = interpreter.get_tensor(output_details[0]['index'])

    # Handle output shapes dynamically
    num_classes = prediction.shape[-1]
    
    if num_classes == 1:
        # Binary classification with 1 sigmoid output (predicts probability of index 1: 'scream')
        prob_scream = float(prediction[0][0])
        if prob_scream > 0.5:
            predicted_class = 1
            confidence = prob_scream
        else:
            predicted_class = 0
            confidence = 1.0 - prob_scream
    else:
        # Multi-class classification (softmax over 2 or more outputs)
        predicted_class = int(np.argmax(prediction))
        confidence = float(np.max(prediction))

    label = LABELS.get(predicted_class, f"unknown_class_{predicted_class}")
    return label, confidence
