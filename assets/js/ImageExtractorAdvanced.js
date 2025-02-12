
const sectionsContainer = document.getElementById('sectionsContainer');
const outputContainer = document.getElementById('finishedOutput');

function generateSectionInputs() {
    sectionsContainer.innerHTML = '';
    const numberOfSections = Number(document.getElementById('numberOfSections').value);
    const fileInput = document.getElementById('upload');

    if (fileInput.files.length === 0) {
        alert("Please upload a BMP image first.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            // Show image details
            let imageInfo = document.getElementById('imageInfo');
            if (!imageInfo) {
                imageInfo = document.createElement('div');
                imageInfo.id = 'imageInfo';
                imageInfo.className = 'alert alert-info mt-3';
                document.querySelector('.container').insertBefore(imageInfo, sectionsContainer);
            }
            imageInfo.innerHTML = `<strong>Selected Image:</strong> ${file.name} <br>
                       <strong>Dimensions:</strong> ${img.width} x ${img.height} pixels`;

            imageInfo.dataset.height = img.height; // Store the height in dataset

            imageInfo.style.display = 'block';

            let previousEndRow = 0; // Start row for the first section

            for (let i = 0; i < numberOfSections; i++) {
                let sectionDiv = document.createElement('div');
                sectionDiv.className = "border p-3 mb-2";

                sectionDiv.innerHTML = `
                    <h5>Section ${i + 1}</h5>
                    <div class="form-row">
                        <div class="col">
                            <label>End Row:</label>
                            <input class="form-control endRowInput" type="number" id="endRow${i}" required>
                        </div>
                        <div class="col">
                            <label>Number of Images:</label>
                            <input class="form-control noOfImagesInput" type="number" id="noOfImages${i}" min="1" value="1" required>
                        </div>
                        <div class="col">
                            <label>Lines Per Image:</label>
                            <input class="form-control linesPerImageInput" type="number" id="linesPerImage${i}" required readonly>
                        </div>
                    </div>
                    <input type="hidden" id="startRow${i}" value="${previousEndRow}">
                `;

                sectionsContainer.appendChild(sectionDiv);



                // Attach event listeners to update linesPerImage dynamically
                document.getElementById(`endRow${i}`).addEventListener('input', () => updateLinesPerImage(i));
                document.getElementById(`noOfImages${i}`).addEventListener('input', () => updateLinesPerImage(i));


                function validateEndRow(input, i) {
                    let imgHeight = Number(document.getElementById('imageInfo').dataset.height); // Get stored height
                    let newEndRow = Number(input.value);

                    if (newEndRow > imgHeight) {
                        alert(`End Row cannot exceed ${imgHeight}. Setting to max height.`);
                        input.value = imgHeight; // Auto-correct
                    }

                    previousEndRow = Number(input.value);
                    if (i + 1 < numberOfSections) {
                        document.getElementById(`startRow${i + 1}`).value = previousEndRow;
                    }
                }

                // Attach event listeners
                document.getElementById(`endRow${i}`).addEventListener('input', function () {
                    validateEndRow(this, i);
                });

            }
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Function to update linesPerImage dynamically
function updateLinesPerImage(index) {
    let startRow = Number(document.getElementById(`startRow${index}`).value);
    let endRow = Number(document.getElementById(`endRow${index}`).value);
    let noOfImages = Number(document.getElementById(`noOfImages${index}`).value);
    let linesPerImageField = document.getElementById(`linesPerImage${index}`);

    if (!isNaN(endRow) && !isNaN(noOfImages) && endRow > startRow) {
        if (noOfImages === 1) {
            linesPerImageField.value = endRow - startRow; // Auto-set if only 1 image
        } else {
            linesPerImageField.value = ''; // Allow user input for multiple images
            linesPerImageField.removeAttribute("readonly");
        }
    } else {
        linesPerImageField.value = '';
    }
}



function startProcessing() {
    const fileInput = document.getElementById('upload');
    if (fileInput.files.length === 0) {
        alert("Please upload a BMP image.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const numberOfSections = Number(document.getElementById('numberOfSections').value);
            let sections = [];

            for (let i = 0; i < numberOfSections; i++) {
                sections.push({
                    startRow: Number(document.getElementById(`startRow${i}`).value),
                    endRow: Number(document.getElementById(`endRow${i}`).value),
                    noOfImages: Number(document.getElementById(`noOfImages${i}`).value),
                    linesPerImage: Number(document.getElementById(`linesPerImage${i}`).value)
                });
            }

            processImage(img, sections);
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}



function processImage(img, sections) {
    outputContainer.innerHTML = '';

    let allCanvasElements = []; // Store all canvases for saving

    sections.forEach((section, secIndex) => {
        let totalRows = section.endRow - section.startRow;
        let currentRow = section.startRow;
        let newCanvasHeight = Math.floor(totalRows / section.noOfImages);
        const resultCanvas = [];

        for (let i = 0; i < section.noOfImages; i++) {
            var newCanvas = document.createElement('canvas');
            newCanvas.width = img.width;
            newCanvas.height = newCanvasHeight;
            resultCanvas[i] = newCanvas;
        }

        var finishedCanvas = createImage(img, resultCanvas, section.linesPerImage, section.noOfImages, currentRow);

        finishedCanvas.forEach((canvas, i) => {
            outputContainer.appendChild(canvas);
            allCanvasElements.push({ canvas, secIndex, imageIndex: i }); // Collect all canvases
        });
    });

    let saveButton = document.getElementById('saveButton');
    if (!saveButton) {
        saveButton = document.createElement('button');
        saveButton.id = 'saveButton';
        saveButton.className = "btn btn-success mt-3";
        saveButton.innerText = "Save BMP Images";
        document.body.appendChild(saveButton);
    }

    saveButton.style.display = 'block';

    // ✅ Attach event listener only once, not inside the loop
    saveButton.onclick = function () {
        allCanvasElements.forEach(({ canvas, secIndex, imageIndex }) => {
            var bmpBlob = canvasToBMP(canvas);
            var link = document.createElement('a');
            link.download = `section_${secIndex + 1}_image_${imageIndex + 1}.bmp`;
            link.href = URL.createObjectURL(bmpBlob);
            link.click();
        });
    };
}

function createImage(img, resultCanvas, noOfTimes, noOfImages, currentRow) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const canvasCtx = [];
    for (let index = 0; index < resultCanvas.length; index++) {
        var newCanvasCtx = resultCanvas[index].getContext('2d');
        canvasCtx[index] = newCanvasCtx;
    }

    var newCanvasHeight = Math.floor(img.height / noOfImages);
    var originalIndex = currentRow;
    for (var y = 0; y < newCanvasHeight; y += noOfTimes) {
        for (let index = 0; index < canvasCtx.length; index++) {
            var row1 = ctx.getImageData(0, originalIndex, img.width, noOfTimes);
            canvasCtx[index].putImageData(row1, 0, y);
            originalIndex += noOfTimes;
        }
    }
    return resultCanvas;
}

function canvasToBMP(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);

    // Encode as BMP
    const rowSize = Math.ceil((3 * width) / 4) * 4; // Each row is padded to a multiple of 4 bytes
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;
    const buffer = new ArrayBuffer(fileSize);
    const dv = new DataView(buffer);

    // BMP Header
    dv.setUint8(0, 0x42); // B
    dv.setUint8(1, 0x4D); // M
    dv.setUint32(2, fileSize, true); // File size
    dv.setUint32(6, 0, true); // Reserved
    dv.setUint32(10, 54, true); // Offset to pixel array

    // DIB Header
    dv.setUint32(14, 40, true); // DIB Header Size
    dv.setInt32(18, width, true); // Width
    dv.setInt32(22, height, true); // Height (positive for bottom-up)
    dv.setUint16(26, 1, true); // Planes
    dv.setUint16(28, 24, true); // Bits per pixel (24-bit)
    dv.setUint32(30, 0, true); // Compression
    dv.setUint32(34, pixelArraySize, true); // Image size
    dv.setUint32(38, 2835, true); // X Pixels per meter (72 DPI)
    dv.setUint32(42, 2835, true); // Y Pixels per meter (72 DPI)
    dv.setUint32(46, 0, true); // Total colors
    dv.setUint32(50, 0, true); // Important colors

    // Pixel Array (RGB with padding for each row)
    let offset = 54;
    for (let y = height - 1; y >= 0; y--) { // Start from the bottom row for bottom-up
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            dv.setUint8(offset++, imageData.data[i + 2]); // Blue
            dv.setUint8(offset++, imageData.data[i + 1]); // Green
            dv.setUint8(offset++, imageData.data[i]);     // Red
        }

        // Add row padding (if any)
        const padding = rowSize - width * 3;
        for (let p = 0; p < padding; p++) {
            dv.setUint8(offset++, 0);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}