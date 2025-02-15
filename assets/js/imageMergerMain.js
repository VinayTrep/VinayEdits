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
        div.innerHTML = `<span>${file.name}</span> <input type='number' class='order-input' min='1' max='${selectedFiles.length}' value='${index + 1}' id='order_${index}'>`;
        orderContainer.appendChild(div);
    });
    orderContainer.style.display = 'block';
    document.getElementById('mergeButton').style.display = 'block';
}

function mergeImages() {
    if (selectedFiles.length === 0) {
        alert("No images selected for merging.");
        return;
    }
    
    // Get user-defined order
    const orderInputs = Array.from(document.querySelectorAll('.order-input'));
    const orderedFiles = orderInputs
        .map(input => ({ file: selectedFiles[parseInt(input.id.split('_')[1])], order: parseInt(input.value) }))
        .sort((a, b) => a.order - b.order)
        .map(item => item.file);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let maxWidth = 0, totalHeight = 0, fileName = "";
    
    const images = [];
    let loadedCount = 0;
    
    orderedFiles.forEach((file, index) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = function () {
            images[index] = img;
            maxWidth = Math.max(maxWidth, img.width);
            totalHeight += img.height;
            fileName += totalHeight + ",";
            loadedCount++;
            if (loadedCount === orderedFiles.length) {
                combineImages(canvas, ctx, images, maxWidth, totalHeight,fileName);
            }
        };
    });
}

function combineImages(canvas, ctx, images, maxWidth, totalHeight,fileName) {
    canvas.width = maxWidth;
    canvas.height = totalHeight;
    let offsetY = 0;

    images.forEach(img => {
        ctx.drawImage(img, 0, offsetY);
        offsetY += img.height;
    });

    // ✅ Check if the "2-Color" checkbox is checked
    const convertCheckbox = document.getElementById("convert1Bit");
    const convertTo1Bit = convertCheckbox ? convertCheckbox.checked : false;
    const renameImage = document.getElementById("renameFile").checked;
    if (convertTo1Bit) {
        convertToMonochrome(canvas, ctx, fileName, renameImage); // 🔥 Ensures 1-bit BMP output
    } else {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const bmpBlob = create24BitBMP(imageData);
        saveBMPFile(bmpBlob, fileName,renameImage);
    }
}

function create24BitBMP(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    
    // ✅ Row size must be a multiple of 4 bytes
    const rowSize = Math.ceil((width * 3) / 4) * 4; 
    const dataSize = rowSize * height;
    const fileSize = fileHeaderSize + infoHeaderSize + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    let offset = 0;

    // ✅ BMP File Header (14 bytes)
    view.setUint16(offset, 0x4D42, true); offset += 2; // "BM" Signature
    view.setUint32(offset, fileSize, true); offset += 4; // File Size
    view.setUint32(offset, 0, true); offset += 4; // Reserved
    view.setUint32(offset, fileHeaderSize + infoHeaderSize, true); offset += 4; // Offset to pixel data

    // ✅ BMP Info Header (40 bytes)
    view.setUint32(offset, infoHeaderSize, true); offset += 4; // Header Size
    view.setInt32(offset, width, true); offset += 4; // Image Width
    view.setInt32(offset, -height, true); offset += 4; // Image Height (negative for top-down)
    view.setUint16(offset, 1, true); offset += 2; // Color Planes (must be 1)
    view.setUint16(offset, 24, true); offset += 2; // **24-bit Depth**
    view.setUint32(offset, 0, true); offset += 4; // Compression (None)
    view.setUint32(offset, dataSize, true); offset += 4; // Image Data Size
    view.setInt32(offset, 2835, true); offset += 4; // Horizontal Resolution (72 DPI)
    view.setInt32(offset, 2835, true); offset += 4; // Vertical Resolution (72 DPI)
    view.setUint32(offset, 0, true); offset += 4; // Number of Colors
    view.setUint32(offset, 0, true); offset += 4; // Important Colors

    // ✅ BMP Pixel Data (Stored **Bottom-Up** Format)
    let pixelOffset = fileHeaderSize + infoHeaderSize;
    const padding = rowSize - width * 3; // Row padding to make it 4-byte aligned

    for (let y = 0; y < height; y++) {
        let rowStart = (height - y - 1) * width * 4; // BMP is stored bottom-to-top
        for (let x = 0; x < width; x++) {
            let pixelIndex = rowStart + x * 4;
            view.setUint8(pixelOffset++, data[pixelIndex + 2]); // Red
            view.setUint8(pixelOffset++, data[pixelIndex + 1]); // Green
            view.setUint8(pixelOffset++, data[pixelIndex]);     // Blue
        }
        // ✅ Add row padding (if needed)
        for (let p = 0; p < padding; p++) {
            view.setUint8(pixelOffset++, 0);
        }
    }

    return new Blob([buffer], { type: "image/bmp" });
}



function convertToMonochrome(canvas, ctx, fileName,renameImage) {
    console.log("Converting to monochrome...");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Create an empty binary array for 1-bit BMP data
    let monoData = new Uint8Array(Math.ceil((width * height) / 8));

    for (let i = 0; i < width * height; i++) {
        const pixelIndex = i * 4;
        const avg = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        const bit = avg > 128 ? 1 : 0; // Convert to black or white

        let byteIndex = Math.floor(i / 8);
        let bitPosition = 7 - (i % 8);
        if (bit) {
            monoData[byteIndex] |= (1 << bitPosition);
        }
    }

    // Convert the processed data into a proper BMP format
    const bmpBlob = create1BitBMP(monoData, width, height);
    saveBMPFile(bmpBlob, fileName, renameImage);
}


function create1BitBMP(pixelData, width, height) {
    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const paletteSize = 8; // 2 colors (black & white)
    const rowSize = Math.ceil(width / 8); // Each row must be a multiple of 4 bytes
    const padding = (4 - (rowSize % 4)) % 4;
    const dataSize = (rowSize + padding) * height;

    const fileSize = fileHeaderSize + infoHeaderSize + paletteSize + dataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    let offset = 0;

    // BMP File Header (14 bytes)
    view.setUint16(offset, 0x4D42, true); offset += 2; // "BM" identifier
    view.setUint32(offset, fileSize, true); offset += 4; // File size
    view.setUint32(offset, 0, true); offset += 4; // Reserved
    view.setUint32(offset, fileHeaderSize + infoHeaderSize + paletteSize, true); offset += 4; // Pixel data offset

    // BMP Info Header (40 bytes)
    view.setUint32(offset, infoHeaderSize, true); offset += 4; // Header size
    view.setInt32(offset, width, true); offset += 4; // Width
    view.setInt32(offset, -height, true); offset += 4; // Height (negative for top-down)
    view.setUint16(offset, 1, true); offset += 2; // Color planes (must be 1)
    view.setUint16(offset, 1, true); offset += 2; // Bits per pixel (1-bit)
    view.setUint32(offset, 0, true); offset += 4; // Compression (none)
    view.setUint32(offset, dataSize, true); offset += 4; // Image data size
    view.setInt32(offset, 2835, true); offset += 4; // Horizontal resolution (72 DPI)
    view.setInt32(offset, 2835, true); offset += 4; // Vertical resolution (72 DPI)
    view.setUint32(offset, 2, true); offset += 4; // Number of colors in the palette
    view.setUint32(offset, 0, true); offset += 4; // Important colors

    // BMP Palette (8 bytes, 2 colors: black and white)
    view.setUint32(offset, 0x00000000, true); offset += 4; // Black
    view.setUint32(offset, 0x00FFFFFF, true); offset += 4; // White

    // BMP Pixel Data
    let pixelOffset = fileHeaderSize + infoHeaderSize + paletteSize;
    let rowStart = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < rowSize; x++) {
            view.setUint8(pixelOffset++, pixelData[rowStart + x]);
        }
        pixelOffset += padding; // Apply row padding
        rowStart += rowSize;
    }

    return new Blob([buffer], { type: "image/bmp" });
}


function saveBMPFile(blob, fileName, renameImage) {
    const name = renameImage ? fileName + ".bmp" : "merged.bmp";
    const file = new File([blob], name , { type: "image/bmp" });
    showDownloadButton([file]);
}


function showDownloadButton(processedImages) {
    const saveButton = document.getElementById("saveButton");
    if (!saveButton) {
        console.error("Save button not found");
        return;
    }
    saveButton.innerHTML = "Download Merged Image";
    saveButton.style.display = "block";
    
    saveButton.onclick = function () {
        processedImages.forEach(file => {
            const url = URL.createObjectURL(file);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        });
    };
}
