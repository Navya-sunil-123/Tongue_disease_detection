import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
from flask import Flask, render_template, request, jsonify
import logging

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
logger.info(f"Using device: {device}")

# Model configuration
num_classes = 2  # Binary classification
class_names = ['diabetes', 'normal']

# Get the absolute path to the model file
model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..','app', 'models', 'efficientnet_model.pth'))
logger.info(f"Looking for model at: {model_path}")

try:
    # Load the model
    model = models.efficientnet_b0(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(1280, num_classes)
    )
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
        
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")
    raise

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def preprocess_image(image):
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = transform(image)
    return image.unsqueeze(0)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'})
    
    try:
        # Read and preprocess the image
        image = Image.open(file.stream)
        logger.info(f"Image opened successfully: {file.filename}")
        
        input_tensor = preprocess_image(image).to(device)
        logger.info("Image preprocessed successfully")
        
        # Get prediction
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            predicted_class = torch.argmax(probabilities).item()
            logger.info(f"Prediction made successfully: {class_names[predicted_class]}")
            
        # Get class probabilities
        probs = probabilities[0].cpu().numpy()
        predictions = {class_names[i]: float(probs[i]) for i in range(len(class_names))}
        
        return jsonify({
            'prediction': class_names[predicted_class],
            'probabilities': predictions
        })
        
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    # Make sure we're in the right directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    logger.info(f"Working directory: {os.getcwd()}")
    app.run(debug=True) 