
let selectedFiles = [];

function askForOrder() {
    const input = document.getElementById('fileInput');
    selectedFiles = Array.from(input.files);
    if (selectedFiles.length === 0) {
        alert('Please select BMP files.');
        return;
    }

    const orderContainer = document.getElementById('orderContainer');
    orderContainer.innerHTML = "<h3>Arrange Order</h3>";
    orderContainer.dataset.count = selectedFiles.length;

    selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.innerHTML = `<input type='number' class='order-input' min='1' max='${selectedFiles.length}' value='${index + 1}' id='order_${index}'> ${file.name}`;
        orderContainer.appendChild(div);
    });
    orderContainer.style.display = 'block';
    document.getElementById('mergeButton').style.display = 'block';
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


async function mergeImages() {
    const progressBarContainer = document.getElementById('progressBarContainer');
    progressBarContainer.style.display = 'block'; // Show progress bar

    let orderInputs = document.querySelectorAll('.order-input');
    let orderSet = new Set();
    let orderedFiles = Array(selectedFiles.length).fill(null);

    for (let input of orderInputs) {
        let position = parseInt(input.value);
        if (position < 1 || position > selectedFiles.length || orderSet.has(position)) {
            alert("Invalid or duplicate order values. Please ensure each image has a unique order between 1 and " + selectedFiles.length);
            return;
        }
        orderSet.add(position);
        orderedFiles[position - 1] = selectedFiles[parseInt(input.id.split('_')[1])];
    }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let images = [];
    let totalHeight = 0;
    let maxWidth = 0;
    let fileName = "";
    const loadImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    try {
        // Load images and update progress
        for (let i = 0; i < orderedFiles.length; i++) {
            const img = await loadImage(orderedFiles[i]);
            images.push(img);
            updateProgressBar((i + 1) / orderedFiles.length * 50); // 50% for loading
        }

        // Calculate canvas dimensions
        images.forEach(img => {
            totalHeight += img.height;
            fileName += totalHeight + ",";
            maxWidth = Math.max(maxWidth, img.width);
        });

        canvas.width = maxWidth;
        canvas.height = totalHeight;

        // Draw images and update progress
        let yOffset = 0;
        for (let i = 0; i < images.length; i++) {
            ctx.drawImage(images[i], 0, yOffset);
            yOffset += images[i].height;
            updateProgressBar(50 + ((i + 1) / images.length * 50)); // 50% for drawing
        }

        let isOneBitBMP = document.getElementById("convert1Bit").checked;
        let isRenameFile = document.getElementById("renameFile").checked;

        // Convert to BMP and update progress
        const bmpBlob = isOneBitBMP === true ? canvasTo1BitBlackAndWhiteBMP(canvas) : convertTo24BitBMP(canvas);
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = URL.createObjectURL(bmpBlob);
        downloadLink.download = isRenameFile === true ?  fileName + ".bmp" :  "merged_image.bmp";
        downloadLink.style.display = 'block';
        downloadLink.textContent = "save";

        updateProgressBar(100); // Complete
    } catch (error) {
        alert('Error loading images: ' + error);
    }
}



function canvasTo1BitBlackAndWhiteBMP(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const colorTableSize = 2 * 4;
    const rowSize = Math.ceil(width / 8);
    const pixelArraySize = rowSize * height;
    const fileSize = fileHeaderSize + infoHeaderSize + colorTableSize + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    view.setUint8(0, 0x42);
    view.setUint8(1, 0x4D);
    view.setUint32(2, fileSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, fileHeaderSize + infoHeaderSize + colorTableSize, true);

    view.setUint32(14, infoHeaderSize, true);
    view.setInt32(18, width, true);
    view.setInt32(22, -height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 1, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelArraySize, true);
    view.setInt32(38, 96, true);
    view.setInt32(42, 96, true);
    view.setUint32(46, 2, true);
    view.setUint32(50, 0, true);

    view.setUint32(54, 0x00000000, true);
    view.setUint32(58, 0x00FFFFFF, true);

    let offset = fileHeaderSize + infoHeaderSize + colorTableSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += 8) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                let i = ((y * width) + (x + bit)) * 4;
                let isWhite = data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200; // Check if all RGB components are greater than 200
                byte |= (isWhite ? 1 : 0) << (7 - bit);
            }
            view.setUint8(offset++, byte);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

function convertTo24BitBMP(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const bytesPerPixel = 3; // 24-bit (RGB)
    const rowPadding = (4 - ((width * bytesPerPixel) % 4)) % 4; // Ensure row size is a multiple of 4
    const rowSize = width * bytesPerPixel + rowPadding;
    const pixelArraySize = rowSize * height;
    const fileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // BMP File Header
    view.setUint8(0, 0x42); // 'B'
    view.setUint8(1, 0x4D); // 'M'
    view.setUint32(2, fileSize, true); // File size
    view.setUint32(6, 0, true); // Reserved
    view.setUint32(10, fileHeaderSize + infoHeaderSize, true); // Pixel data offset

    // BMP Info Header
    view.setUint32(14, infoHeaderSize, true); // Info header size
    view.setInt32(18, width, true); // Width
    view.setInt32(22, -height, true); // Negative height for top-down bitmap
    view.setUint16(26, 1, true); // Planes
    view.setUint16(28, 24, true); // Bits per pixel (24-bit)
    view.setUint32(30, 0, true); // Compression (None)
    view.setUint32(34, pixelArraySize, true); // Image data size
    view.setInt32(38, 2835, true); // X resolution (72 DPI)
    view.setInt32(42, 2835, true); // Y resolution (72 DPI)
    view.setUint32(46, 0, true); // Colors in palette (not used)
    view.setUint32(50, 0, true); // Important colors (not used)

    let offset = fileHeaderSize + infoHeaderSize;

    // Write pixel data (BGR format)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let i = (y * width + x) * 4;
            view.setUint8(offset++, data[i + 2]); // Blue
            view.setUint8(offset++, data[i + 1]); // Green
            view.setUint8(offset++, data[i]);     // Red
        }
        // Add row padding (BMP requires each row size to be a multiple of 4)
        for (let p = 0; p < rowPadding; p++) {
            view.setUint8(offset++, 0);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}



