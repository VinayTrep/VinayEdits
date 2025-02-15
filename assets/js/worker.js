console.log("Worker Loaded");

self.onmessage = async function (event) {
    const { images, chunkIndex, convertTo1Bit, renameFile } = event.data;

    console.log(`Processing chunk ${chunkIndex + 1} with ${images.length} images...`);
    console.log("Worker Loaded");

    self.onmessage = async function (event) {
        const { images, convertTo1Bit, renameFile } = event.data;
    
        console.log(`Processing ${images.length} images...`);
    
        const processedImages = await mergeImagesWorker(images, convertTo1Bit);
    
        self.postMessage({ progress: images.length, done: true, processedImages });
    };
    
    async function mergeImagesWorker(images, convertTo1Bit) {
        const firstImg = await createImageBitmap(images[0]);
        let maxWidth = firstImg.width;
        let totalHeight = 0;
    
        // Calculate max width and total height
        const imageBitmaps = await Promise.all(
            images.map(async (img) => {
                const bitmap = await createImageBitmap(img);
                maxWidth = Math.max(maxWidth, bitmap.width);
                totalHeight += bitmap.height;
                return bitmap;
            })
        );
    
        // Create an OffscreenCanvas
        const canvas = new OffscreenCanvas(maxWidth, totalHeight);
        const ctx = canvas.getContext("2d");
    
        let offsetY = 0;
        imageBitmaps.forEach((img) => {
            ctx.drawImage(img, 0, offsetY);
            offsetY += img.height;
        });
    
        let fileName = renameFile ? "processed_image.bmp" : "merged.bmp";
        let bmpBuffer;
    
        if (convertTo1Bit) {
            convertToMonochrome(canvas, ctx);
            bmpBuffer = await generate1BitBMP(canvas);
        } else {
            bmpBuffer = await generate24BitBMP(canvas);
        }
    
        return [new File([bmpBuffer], fileName, { type: "image/bmp" })];
    }
    
    function convertToMonochrome(canvas, ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
    
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const color = avg > 128 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = color;
        }
    
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Function to generate 1-bit BMP buffer
    async function generate1BitBMP(canvas) {
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
    
        // BMP row padding (each row must be a multiple of 4 bytes)
        const rowSize = Math.ceil(width / 8);
        const paddingSize = (4 - (rowSize % 4)) % 4;
        const dataSize = (rowSize + paddingSize) * height;
    
        const bmpHeaderSize = 14; // BMP Header
        const dibHeaderSize = 40; // DIB Header
        const colorTableSize = 8; // 2 colors (Black & White)
        const fileSize = bmpHeaderSize + dibHeaderSize + colorTableSize + dataSize;
    
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);
        let offset = 0;
    
        // BMP Header
        view.setUint16(offset, 0x4D42, true); // 'BM'
        offset += 2;
        view.setUint32(offset, fileSize, true); // File size
        offset += 4;
        view.setUint32(offset, 0, true); // Reserved
        offset += 4;
        view.setUint32(offset, bmpHeaderSize + dibHeaderSize + colorTableSize, true); // Pixel data offset
        offset += 4;
    
        // DIB Header
        view.setUint32(offset, dibHeaderSize, true); // DIB header size
        offset += 4;
        view.setInt32(offset, width, true); // Width
        offset += 4;
        view.setInt32(offset, -height, true); // Height (negative for top-down)
        offset += 4;
        view.setUint16(offset, 1, true); // Planes
        offset += 2;
        view.setUint16(offset, 1, true); // Bits per pixel (1-bit)
        offset += 2;
        view.setUint32(offset, 0, true); // Compression (BI_RGB, no compression)
        offset += 4;
        view.setUint32(offset, dataSize, true); // Image size
        offset += 4;
        view.setUint32(offset, 0, true); // X pixels per meter
        offset += 4;
        view.setUint32(offset, 0, true); // Y pixels per meter
        offset += 4;
        view.setUint32(offset, 2, true); // Colors in palette
        offset += 4;
        view.setUint32(offset, 0, true); // Important colors
        offset += 4;
    
        // Color Table (Black & White)
        view.setUint32(offset, 0x00000000, true); // Black
        offset += 4;
        view.setUint32(offset, 0x00FFFFFF, true); // White
        offset += 4;
    
        // Pixel Data (1-bit format)
        for (let y = 0; y < height; y++) {
            let rowOffset = offset + (rowSize + paddingSize) * y;
            for (let x = 0; x < width; x++) {
                let byteIndex = Math.floor(x / 8);
                let bitIndex = 7 - (x % 8);
                const pixelIndex = (y * width + x) * 4;
                const color = data[pixelIndex] === 0 ? 0 : 1;
                view.setUint8(rowOffset + byteIndex, (view.getUint8(rowOffset + byteIndex) | (color << bitIndex)));
            }
        }
    
        return buffer;
    }
    
    // Function to generate 24-bit BMP buffer
    async function generate24BitBMP(canvas) {
        const blob = await canvas.convertToBlob({ type: "image/bmp" });
        return blob.arrayBuffer();
    }
    
    const processedImages = [];

    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const processedImage = await processImage(image, convertTo1Bit);

        if (renameFile) {
            processedImage.name = `processed_${chunkIndex}_${i}.bmp`;
        }

        processedImages.push(processedImage);
    }

    self.postMessage({ progress: chunkIndex + 1, done: true, processedImages });
};

// ✅ Convert to 1-bit (Monochrome) if needed, otherwise keep 24-bit BMP
async function processImage(image, convertTo1Bit) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(image);

        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            createImageBitmap(new Blob([arrayBuffer]))
                .then((bitmap) => {
                    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                    const ctx = canvas.getContext("2d");

                    ctx.drawImage(bitmap, 0, 0);

                    if (convertTo1Bit) {
                        // Convert to 1-bit monochrome (pure black & white)
                        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
                        const data = imageData.data;

                        for (let i = 0; i < data.length; i += 4) {
                            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                            const color = avg > 128 ? 255 : 0; // Threshold for monochrome
                            data[i] = data[i + 1] = data[i + 2] = color; // Apply black or white
                        }

                        ctx.putImageData(imageData, 0, 0);
                    }

                    // Convert canvas to BMP format (1-bit or 24-bit)
                    canvas.convertToBlob({ type: "image/bmp" }).then((blob) => {
                        resolve(new File([blob], image.name, { type: "image/bmp" }));
                    });
                })
                .catch((err) => console.error("Error creating ImageBitmap:", err));
        };
    });
}
