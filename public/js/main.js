(function () {

	// Elements
	const dropZone = document.getElementById('drop-zone');
	const background = document.getElementById('background');
	const canvas = document.getElementById('canvas');
	const ctx = canvas.getContext('2d');
	const cursor = document.getElementById('cursor');

	// Variables
	let isDrawing = false;
	let isDimming = false;
	let lastX = 0;
	let lastY = 0;

	// Brush settings
	const brushSettings = {
		size: 10,
		opacity: 100,
		falloff: 50,
		color: '#ffffff'
	};

	// Color palette - 16 colors array
	const colorPalette = [
		'#ffffff', // White
		'#000000', // Black
		'#ff0000', // Red
		'#00ff00', // Green
		'#0000ff', // Blue
		'#ffff00', // Yellow
		'#00ffff', // Cyan
		'#ff00ff', // Magenta
		'#ff8000', // Orange
		'#8000ff', // Purple
		'#0080ff', // Light Blue
		'#ff0080', // Pink
		'#80ff00', // Lime
		'#996633', // Brown
		'#808080', // Gray
		'#ff8080'  // Light Red
	];

	let hasInstructions = true;

	function hideInstructions() {

		if (!hasInstructions)
			return;

		const instructions = document.querySelector('.instructions');
		instructions.classList.add('collapsed');

		hasInstructions = false;
	}

	// Initialize canvas size
	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	// Set up brush settings controls
	function setupBrushControls() {
		// Size slider
		const sizeSlider = document.getElementById('brush-size');
		const sizeValue = document.getElementById('brush-size-value');
		sizeSlider.addEventListener('input', function () {
			brushSettings.size = parseInt(this.value);
			sizeValue.textContent = this.value;
			updateCursorSize();
		});

		// Opacity slider
		const opacitySlider = document.getElementById('brush-opacity');
		const opacityValue = document.getElementById('brush-opacity-value');
		opacitySlider.addEventListener('input', function () {
			brushSettings.opacity = parseInt(this.value);
			opacityValue.textContent = this.value;
		});

		// Falloff slider
		const falloffSlider = document.getElementById('brush-falloff');
		const falloffValue = document.getElementById('brush-falloff-value');
		falloffSlider.addEventListener('input', function () {
			brushSettings.falloff = parseInt(this.value);
			falloffValue.textContent = this.value;
		});

		// Color palette
		const palette = document.getElementById('color-palette');

		// Clear existing swatches
		palette.innerHTML = '';

		// Create color swatches
		colorPalette.forEach(color => {
			const swatch = document.createElement('div');
			swatch.className = 'color-swatch';
			swatch.style.backgroundColor = color;
			if (color === brushSettings.color) {
				swatch.classList.add('selected');
			}

			swatch.addEventListener('click', function () {
				// Remove selected class from all swatches
				document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
				// Add selected class to clicked swatch
				this.classList.add('selected');
				// Update brush color
				brushSettings.color = color;
			});

			palette.appendChild(swatch);
		});

		// Toggle controls panel
		const controlsPanel = document.querySelector('.controls-panel');
		const controlsTitle = document.querySelector('.controls-panel h3');

		controlsTitle.addEventListener('click', function () {
			controlsPanel.classList.toggle('collapsed');
		});
	}

	// Update cursor size based on brush size
	function updateCursorSize() {
		const size = brushSettings.size;
		cursor.style.width = `${size * 2}px`;
		cursor.style.height = `${size * 2}px`;
	}

	// Set up event listeners
	function init() {
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Drag and drop handling
		document.addEventListener('dragover', (e) => {
			e.preventDefault();
			dropZone.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
		});

		document.addEventListener('dragleave', () => {
			dropZone.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
		});

		document.addEventListener('drop', handleImageDrop);

		// Drawing handling
		document.addEventListener('mousedown', startDrawing);
		document.addEventListener('mousemove', draw);
		document.addEventListener('mouseup', stopDrawing);
		document.addEventListener('mouseleave', stopDrawing);

		// Key handling
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);

		// Custom cursor
		document.addEventListener('mousemove', updateCursorPosition);

		// Setup brush controls
		setupBrushControls();
		updateCursorSize();
	}

	// Handle dropped image files
	function handleImageDrop(e) {
		e.preventDefault();

		const file = e.dataTransfer.files[0];
		if (file && file.type.match('image.*')) {
			const reader = new FileReader();

			reader.onload = function (event) {
				background.style.backgroundImage = `url(${event.target.result})`;
				dropZone.classList.add('hidden');
			};

			reader.readAsDataURL(file);
		}
	}

	// Update cursor position
	function updateCursorPosition(e) {
		cursor.style.left = `${e.clientX}px`;
		cursor.style.top = `${e.clientY}px`;
	}

	// Create a brush based on current settings
	function createBrush(size, opacity, falloff) {

		// Create a temporary canvas for the brush
		const brushCanvas = document.createElement('canvas');
		const brushSize = size * 2; // Double size for the full brush (radius to diameter)
		brushCanvas.width = brushSize;
		brushCanvas.height = brushSize;

		const brushCtx = brushCanvas.getContext('2d');

		// Create a radial gradient for the brush
		const gradient = brushCtx.createRadialGradient(
			size, size, 0,           // Inner circle (center point, 0 radius)
			size, size, size         // Outer circle (center point, full radius)
		);

		// Calculate gradient stops based on falloff
		// Falloff of 100 means hard edge (steep falloff)
		// Falloff of 1 means soft edge (gradual falloff)
		const falloffFactor = (101 - falloff) / 100; // Invert so 1 is hardest, 100 is softest

		// Add color stops for gradient
		gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity / 100})`);
		gradient.addColorStop(falloffFactor, `rgba(255, 255, 255, ${opacity / 100 * 0.8})`);
		gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

		// Fill the temporary canvas with the gradient
		brushCtx.fillStyle = gradient;
		brushCtx.fillRect(0, 0, brushSize, brushSize);

		return brushCanvas;
	}

	// Drawing functions
	function startDrawing(e) {
		isDrawing = true;
		draw(e); // Draw a single dot when clicking

		hideInstructions();
	}

	function draw(e) {
		if (!isDrawing)
			return;

		// Get current brush settings
		const { size, opacity, falloff, color } = brushSettings;

		// For line drawing between points
		if (lastX !== 0 && lastY !== 0) {
			// Draw a line between last position and current position
			const distance = Math.sqrt(Math.pow(e.clientX - lastX, 2) + Math.pow(e.clientY - lastY, 2));
			const angle = Math.atan2(e.clientY - lastY, e.clientX - lastX);

			// If distance is small, just draw one brush stamp
			if (distance < size / 2) {
				drawBrushStamp(e.clientX, e.clientY);
			} else {
				// For longer distances, interpolate points along the line
				const steps = Math.max(Math.floor(distance / (size / 4)), 1);
				for (let i = 0; i <= steps; i++) {
					const x = lastX + Math.cos(angle) * distance * (i / steps);
					const y = lastY + Math.sin(angle) * distance * (i / steps);
					drawBrushStamp(x, y);
				}
			}
		} else {
			// Just draw at current position if no last position
			drawBrushStamp(e.clientX, e.clientY);
		}

		[lastX, lastY] = [e.clientX, e.clientY];
	}

	function drawBrushStamp(x, y) {
		const { size, opacity, falloff, color } = brushSettings;

		// Save context state
		ctx.save();

		// Set global composite operation for proper alpha blending
		ctx.globalCompositeOperation = 'source-over';

		// Set the global alpha based on opacity
		ctx.globalAlpha = opacity / 100;

		// Create a brush pattern with current settings
		const brushPattern = createBrush(size, 100, falloff); // Using 100 for opacity here, we'll apply global opacity

		// Apply color to the brush (using a temporary canvas)
		const colorCanvas = document.createElement('canvas');
		colorCanvas.width = brushPattern.width;
		colorCanvas.height = brushPattern.height;
		const colorCtx = colorCanvas.getContext('2d');

		// Fill with color
		colorCtx.fillStyle = color;
		colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);

		// Apply brush pattern as mask
		colorCtx.globalCompositeOperation = 'destination-in';
		colorCtx.drawImage(brushPattern, 0, 0);

		// Draw the colored brush on main canvas
		ctx.drawImage(colorCanvas, x - size, y - size);

		// Restore context state
		ctx.restore();
	}

	function stopDrawing() {
		isDrawing = false;
		lastX = 0;
		lastY = 0;
	}

	// Handle key presses
	function handleKeyDown(e) {
		// Dim background with SHIFT
		if (e.key === 'Shift' && !isDimming) {
			isDimming = true;
			background.style.filter = 'brightness(0.5)';
		}

		// Clear canvas with SPACE
		if (e.code === 'Space') {
			clearCanvas();
			e.preventDefault(); // Prevent page scrolling
		}

		// Reset everything with ESC
		if (e.key === 'Escape') {
			resetAll();
		}
	}

	function handleKeyUp(e) {
		if (e.key === 'Shift') {
			isDimming = false;
			background.style.filter = 'brightness(1)';
		}
	}

	// Clear the canvas
	function clearCanvas() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	// Reset everything
	function resetAll() {
		clearCanvas();
		background.style.backgroundImage = '';
		background.style.filter = 'brightness(1)';
		dropZone.classList.remove('hidden');
		isDimming = false;
	}

	// Toggle instructions panel
	function toggleInstructions() {
		const instructions = document.querySelector('.instructions');
		instructions.classList.toggle('collapsed');
	}

	// Add click handler for instructions toggle
	function setupInstructionsToggle() {
		const instructions = document.querySelector('.instructions');
		const instructionsTitle = document.querySelector('.instructions h3');

		// Set initial state (expanded)
		instructions.classList.add('collapsed');

		// Add click event to the title
		instructionsTitle.addEventListener('click', toggleInstructions);
		instructions.addEventListener('click', function (e) {
			if (instructions.classList.contains('collapsed')) {
				toggleInstructions();
			}
		});
	}

	// Update cursor size and appearance
	function updateCursorPosition(e) {
		const size = brushSettings.size;
		cursor.style.left = `${e.clientX}px`;
		cursor.style.top = `${e.clientY}px`;

		// Scale the cursor size according to brush size
		const scale = Math.max(1, size / 15); // Base scale on reasonable default
		cursor.style.transform = `translate(-40%, -40%) rotate(45deg) scale(${scale})`;
	}

	// Initialize the app
	init();
	setupInstructionsToggle();

})();