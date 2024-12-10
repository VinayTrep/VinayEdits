document.getElementById('upload').addEventListener('change', function (event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {

            var noOfImages = Number(document.getElementById('noOfImages').value);
            var noOfTimes = Number(document.getElementById('noOfTimes').value);
            var newCanvasHeight = Math.floor(img.height / noOfImages);
            const resultCanvas = [];
            for (let index = 0; index < noOfImages; index++) {
                var newCanvas = document.createElement('canvas');
                newCanvas.width = img.width;
                newCanvas.height = newCanvasHeight;
                resultCanvas[index] = newCanvas;
            }

            var finishedCanvas = createImage(img, resultCanvas, noOfTimes, noOfImages);

            // Append the merged canvas to the body
            for (let index = 0; index < finishedCanvas.length; index++) {
                document.getElementById('finisedOutput').appendChild(finishedCanvas[index]);
            }

            // Show the save button
            document.getElementById('saveButton').style.display = 'block';

            // Save the merged image as a new file
            document.getElementById('saveButton').addEventListener('click', function () {
                for (let index = 0; index < finishedCanvas.length; index++) {
                    var canvas = finishedCanvas[index];

                    // Convert canvas to BMP using canvas-to-bmp library
                    var bmpBlob = canvasToBMP(canvas);

                    // Create a download link
                    var link = document.createElement('a');
                    link.download = `merged_image_${index + 1}.bmp`;
                    link.href = URL.createObjectURL(bmpBlob);
                    link.click();
                }
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

function createImage(img, resultCanvas, noOfTimes, noOfImages) {
    var canvas = document.getElementById('canvas');
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
    var originalIndex = 0;
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
