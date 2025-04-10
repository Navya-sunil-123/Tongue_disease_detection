document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewImage = document.getElementById('previewImage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultsSection = document.querySelector('.results-section');
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('highlight-dropzone');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('highlight-dropzone');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('highlight-dropzone');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.style.width = 'auto';
                previewImage.style.height = 'auto';
                dropZone.classList.add('has-preview');
                analyzeBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    // Analyze button handler
    analyzeBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            // Update prediction text
            const predictionText = document.getElementById('predictionText');
            predictionText.textContent = data.prediction;
            predictionText.className = data.prediction.toLowerCase();
            
            // Update probability bars
            const probabilityBars = document.getElementById('probabilityBars');
            probabilityBars.innerHTML = '';
            
            for (const [className, probability] of Object.entries(data.probabilities)) {
                const percentage = (probability * 100).toFixed(1);
                const barContainer = document.createElement('div');
                barContainer.className = 'probability-bar-container';
                
                const label = document.createElement('div');
                label.className = 'probability-label';
                label.textContent = `${className}: ${percentage}%`;
                
                const bar = document.createElement('div');
                bar.className = 'probability-bar';
                
                const fill = document.createElement('div');
                fill.className = `probability-bar-fill ${className.toLowerCase()}`;
                fill.style.width = `${percentage}%`;
                
                bar.appendChild(fill);
                barContainer.appendChild(label);
                barContainer.appendChild(bar);
                probabilityBars.appendChild(barContainer);
            }
            
            // Show results
            resultsSection.style.display = 'block';
            
        } catch (error) {
            alert('Error analyzing image. Please try again.');
            console.error('Error:', error);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });
}); 