const sectionsContainer = document.getElementById('sectionsContainer');
const outputContainer = document.getElementById('finishedOutput');
let endRowType = 'absolute'; // Global variable to track end row type (absolute/relative)
let globalLinesPerImage = 2; // Default global lines per image

function setEndRowType(type) {
    endRowType = type;
}

// Populate the #endRowType div with the dropdown for selecting absolute or relative end row type
document.addEventListener("DOMContentLoaded", function () {
    const dropdownDiv = document.getElementById("endRowType");
    dropdownDiv.className = "form-group";
    dropdownDiv.innerHTML = `
        <label for="endRowTypeSelect">End Row Type:</label>
        <select id="endRowTypeSelect" class="form-control mb-3">
            <option value="absolute">Absolute</option>
            <option value="relative">Relative(offset)</option>
        </select>
    `;
    document.getElementById("endRowTypeSelect").addEventListener("change", function () {
        setEndRowType(this.value);
    });

    const globalLinesDiv = document.getElementById("globalLinesPerImage");
    globalLinesDiv.className = "form-group";
    globalLinesDiv.innerHTML = `
        <label for="globalLinesPerImageSelect">Global Lines Per Image:</label>
        <input id="globalLinesPerImageSelect" type="number" class="form-control mb-3" value="2" min="1">
    `;
    document.getElementById("globalLinesPerImageSelect").addEventListener("input", function () {
        globalLinesPerImage = Number(this.value) || 10;
        updateAllLinesPerImage();
    });
});

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
            let imageInfo = document.getElementById('imageInfo');
            if (!imageInfo) {
                imageInfo = document.createElement('div');
                imageInfo.id = 'imageInfo';
                imageInfo.className = 'alert alert-info mt-3 sticky-top ';
                document.querySelector('.container').insertBefore(imageInfo, sectionsContainer);
            }
            imageInfo.innerHTML = `<strong>Selected Image:</strong> ${file.name} <br>
                       <strong>Dimensions:</strong> ${img.width} x ${img.height} pixels`;

            imageInfo.dataset.height = img.height;
            imageInfo.style.display = 'block';

            let previousEndRow = 0;

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
                            <input class="form-control linesPerImageInput" type="number" id="linesPerImage${i}" required>
                        </div>
                    </div>
                    <input type="hidden" id="startRow${i}" value="${previousEndRow}">
                `;

                sectionsContainer.appendChild(sectionDiv);

                document.getElementById(`endRow${i}`).addEventListener('change', function () {
                    validateEndRow(this, i);
                });

                document.getElementById(`noOfImages${i}`).addEventListener('input', function () {
                    updateLinesPerImage(i);
                });

                document.getElementById(`linesPerImage${i}`).addEventListener('input', function () {
                    validateLinesPerImage(i);
                });
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function validateEndRow(input, i) {
    let imgHeight = Number(document.getElementById('imageInfo').dataset.height);
    let newEndRow = Number(input.value);
    let previousEndRow = i > 0 ? Number(document.getElementById(`endRow${i - 1}`).value) : 0;

    if (endRowType === 'relative') {
        newEndRow = previousEndRow + newEndRow;
    }

    if (newEndRow > imgHeight || i === document.getElementById('numberOfSections').value - 1) {
        newEndRow = imgHeight; // Automatically set last section to full remaining rows
    }

    input.value = newEndRow;

    if (i + 1 < document.getElementById('numberOfSections').value) {
        document.getElementById(`startRow${i + 1}`).value = newEndRow;
    }

    updateLinesPerImage(i);
}

function updateLinesPerImage(i) {
    let startRow = Number(document.getElementById(`startRow${i}`).value);
    let endRow = Number(document.getElementById(`endRow${i}`).value);
    let numberOfImages = Number(document.getElementById(`noOfImages${i}`).value);
    let linesPerImageInput = document.getElementById(`linesPerImage${i}`);

    if (numberOfImages === 1) {
        linesPerImageInput.value = endRow - startRow;
        linesPerImageInput.readOnly = true;
    } else {
        linesPerImageInput.value = globalLinesPerImage;
        linesPerImageInput.readOnly = false;
    }
}

function updateAllLinesPerImage() {
    const sections = document.getElementsByClassName('linesPerImageInput');
    for (let input of sections) {
        if (!input.readOnly) {
            input.value = globalLinesPerImage;
        }
    }
}

function validateLinesPerImage(i) {
    let linesPerImageInput = document.getElementById(`linesPerImage${i}`);
    let linesPerImage = Number(linesPerImageInput.value);

    if (isNaN(linesPerImage) || linesPerImage < 0) {
        alert("Lines Per Image must be a positive number.");
        linesPerImageInput.value = "";
    }
}


function updateEndRow(index) {
    const endRowInput = document.getElementById(`endRow${index}`);
    endRowInput.value = "";
    endRowInput.placeholder = endRowType === "relative" ? "Enter rows to add" : "Enter absolute row";
}

function updateProgressBar(progress) {
    const progressContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');

    progressContainer.style.display = 'block'; // Ensure visibility
    progressBar.style.width = `${progress}%`;
    progressBar.style.backgroundColor = 'blue'; // Ensuring color update
    progressBar.textContent = `${Math.round(progress)}%`;

    // Ensure repaint
    requestAnimationFrame(() => {
        progressBar.setAttribute('aria-valuenow', progress);
    });
}


async function startProcessing() {
    const progressBarContainer = document.getElementById('progressBarContainer');
    progressBarContainer.style.display = 'block'; // Show progress bar

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
            updateProgressBar(25); // 25% for loading
            processImage(img, sections);
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}



function processImage(img, sections) {
    outputContainer.innerHTML = '';

    let allCanvasElements = []; // Store all canvases for saving
    let progress = 25; // Initial progress
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
        progress += 75/sections.length;
        updateProgressBar(progress); // 25% for loading
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