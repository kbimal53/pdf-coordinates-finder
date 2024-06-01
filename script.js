let selectedBox = null;

document.getElementById('pdf-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedArray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedArray).promise.then(pdf => {
                const pdfPreview = document.getElementById('pdf-preview');
                pdfPreview.innerHTML = ''; // Clear previous preview

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                    pdf.getPage(pageNumber).then(page => {
                        const viewport = page.getViewport({ scale: 1.42 }); // scale for (842, 595)
                        const canvasContainer = document.createElement('div');
                        canvasContainer.className = 'canvas-container';
                        const canvas = document.createElement('canvas');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        canvasContainer.appendChild(canvas);
                        const context = canvas.getContext('2d');
                        
                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        page.render(renderContext).promise.then(() => {
                            const pageDiv = document.createElement('div');
                            pageDiv.className = 'page';
                            pageDiv.appendChild(canvasContainer);
                            pdfPreview.appendChild(pageDiv);

                            // Add functionality to draw, move, and resize the box
                            addResizableBox(pageDiv, viewport.width, viewport.height, pageNumber);
                        });
                    });
                }
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        alert('Please upload a valid PDF file.');
    }
});

function addResizableBox(container, pageWidth, pageHeight, pageNumber) {
    const box = document.createElement('div');
    box.className = 'resizable';
    box.style.width = '122px'; // default width (129-7)
    box.style.height = '62px'; // default height (839-777)
    box.style.transform = 'translate(7px, 3px)'; // default position
    box.setAttribute('data-x', 7);
    box.setAttribute('data-y', 3);
    box.setAttribute('data-page', pageNumber);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    box.appendChild(handle);
    container.appendChild(box);

    interact(box)
        .draggable({
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    endOnly: true,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                })
            ],
            listeners: {
                move(event) {
                    const { target, dx, dy } = event;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + dy;
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    logBoxCoordinates();
                }
            }
        })
        .resizable({
            edges: { bottom: true, right: true },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 10, height: 10 },
                    max: { width: 350, height: 350 }
                }),
                interact.modifiers.restrictEdges({
                    outer: 'parent'
                })
            ],
            listeners: {
                move(event) {
                    const { target, rect } = event;
                    target.style.width = `${rect.width}px`;
                    target.style.height = `${rect.height}px`;
                    logBoxCoordinates();
                }
            }
        });

    box.addEventListener('click', function() {
        selectedBox = box;
        document.getElementById('delete-box').style.display = 'block';
    });

    logBoxCoordinates();
}

function logBoxCoordinates() {
    const boxes = document.querySelectorAll('.resizable');
    const coordinates = [];

    boxes.forEach(box => {
        const page = parseInt(box.getAttribute('data-page'));
        const x = parseFloat(box.getAttribute('data-x')) || 0;
        const y = parseFloat(box.getAttribute('data-y')) || 0;
        const width = box.offsetWidth;
        const height = box.offsetHeight;
        const pageHeight = 842; // Fixed height for each page

        coordinates.push({
            page,
            top_left_x_coordinate: Math.round(x),
            bottom_right_x_coordinate: Math.round(x + width),
            top_left_y_coordinate: Math.round(pageHeight - y - height),
            bottom_right_y_coordinate: Math.round(pageHeight - y)
        });
    });

    let coordinatesText = '';
    coordinates.forEach(coord => {
        coordinatesText += `Page ${coord.page}:\n`;
        coordinatesText += `Top Left X: ${coord.top_left_x_coordinate}\n`;
        coordinatesText += `Bottom Right X: ${coord.bottom_right_x_coordinate}\n`;
        coordinatesText += `Top Left Y: ${coord.top_left_y_coordinate}\n`;
        coordinatesText += `Bottom Right Y: ${coord.bottom_right_y_coordinate}\n\n`;
    });

    document.getElementById('box-coordinates').textContent = coordinatesText;
}

document.getElementById('delete-box').addEventListener('click', function() {
    if (selectedBox) {
        selectedBox.remove();
        selectedBox = null;
        document.getElementById('delete-box').style.display = 'none';
        logBoxCoordinates();
    }
});

document.getElementById('copy-json').addEventListener('click', function() {
    const boxes = document.querySelectorAll('.resizable');
    const coordinates = [];

    boxes.forEach(box => {
        const page = parseInt(box.getAttribute('data-page'));
        const x = parseFloat(box.getAttribute('data-x')) || 0;
        const y = parseFloat(box.getAttribute('data-y')) || 0;
        const width = box.offsetWidth;
        const height = box.offsetHeight;
        const pageHeight = 842; // Fixed height for each page

        coordinates.push({
            page,
            top_left_x_coordinate: Math.round(x),
            bottom_right_x_coordinate: Math.round(x + width),
            top_left_y_coordinate: Math.round(pageHeight - y - height),
            bottom_right_y_coordinate: Math.round(pageHeight - y)
        });
    });

    const coordinatesJSON = JSON.stringify({ sign_positions: coordinates }, null, 2);
    navigator.clipboard.writeText(coordinatesJSON).then(() => {
        alert('JSON copied to clipboard');
    });
});
