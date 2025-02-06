
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
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
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
        console.log("=================");
        console.log("Convert to 1-bit BMP:", isOneBitBMP);
        console.log("=================");

        // Convert to BMP and update progress
        const bmpBlob = isOneBitBMP === true ? canvasTo1BitBlackAndWhiteBMP(canvas):convertTo8BitBMP(canvas);
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = URL.createObjectURL(bmpBlob);
        downloadLink.download = fileName + ".bmp";
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

function convertTo8BitBMP(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const colorTableSize = 256 * 4;
    const rowSize = Math.ceil(width / 4) * 4;  // Ensure row size is a multiple of 4
    const pixelArraySize = rowSize * height;
    const fileSize = fileHeaderSize + infoHeaderSize + colorTableSize + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // BMP File Header
    view.setUint8(0, 0x42);  // 'B'
    view.setUint8(1, 0x4D);  // 'M'
    view.setUint32(2, fileSize, true); // Total file size
    view.setUint32(6, 0, true); // Reserved
    view.setUint32(10, fileHeaderSize + infoHeaderSize + colorTableSize, true); // Offset to pixel data

    // BMP Info Header
    view.setUint32(14, infoHeaderSize, true); // Info header size
    view.setInt32(18, width, true); // Image width
    view.setInt32(22, -height, true); // Image height (negative for top-down)
    view.setUint16(26, 1, true); // Planes
    view.setUint16(28, 8, true); // Bits per pixel (8-bit)
    view.setUint32(30, 0, true); // Compression (None)
    view.setUint32(34, pixelArraySize, true); // Image data size
    view.setInt32(38, 96, true); // X resolution (arbitrary, 96 DPI)
    view.setInt32(42, 96, true); // Y resolution (arbitrary, 96 DPI)
    view.setUint32(46, 256, true); // Colors in color table
    view.setUint32(50, 0, true); // Important colors

    // Create the color palette (256 colors)
    const colorPalette = [];
    const colorIndex = {};  // To map RGB to palette index
    let paletteIndex = 0;

    // First, find unique colors and map them to palette indices
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r},${g},${b}`;

        if (!colorIndex[key]) {
            colorIndex[key] = paletteIndex++;
            // Add the color to the palette (RGB values as is)
            colorPalette.push((r << 16) | (g << 8) | b);
            if (paletteIndex >= 256) break;  // BMP can only have 256 colors in 8-bit
        }
    }

    // Fill the color table with the found colors (default to black if less than 256 colors)
    for (let i = 0; i < 256; i++) {
        const color = colorPalette[i] || 0x000000; // Default to black if less than 256 colors
        view.setUint32(54 + i * 4, color, true);
    }

    let offset = fileHeaderSize + infoHeaderSize + colorTableSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Map the RGB value to its corresponding palette index
            const key = `${r},${g},${b}`;
            const paletteIndex = colorIndex[key];

            // Set the pixel data to the palette index
            view.setUint8(offset++, paletteIndex);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

