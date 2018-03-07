const canvases = [...document.querySelectorAll('canvas')];
const [bck, ctx] = canvases.map(canvas => canvas.getContext('2d'));
import {parseRawLevel, BufferMatrix, reqAnimFrame, sendThrough, listen, between, Vector, waitForEvent, isSameSign, range} from './util.js';
const {floor, ceil, PI, random, min, max, abs} = Math;
document.addEventListener('touchstart', e => e.preventDefault(), {passive: false});
window.debug = false;


/*--- the game ---*/
const start = matrix => {
	if(window.debug) console.log('The default level matrix:', matrix.toString());
	/*--- initalize game variables ---*/
	const paddleConfig = {width: 2, height: 0.2};
	const ballConfig = {radius: 0.1, defaultSpeed: 0.2};
	const paddle = {
		x: (matrix.width - paddleConfig.width) / 2,
		y: matrix.height - paddleConfig.height,
		...paddleConfig
	};
	const balls = [{
		position: new Vector(matrix.width / 2, matrix.height),
		speed: Vector.fromDir(random() * PI + PI/2, ballConfig.defaultSpeed),
		...ballConfig
	}];

	let blockSize = 0;
	let canvasWidth = 0;
	let canvasHeight = 0;
	let canvasOffsetLeft = 0;
	let canvasOffsetTop = 0;
	const drawBlocks = () => {
		matrix.forEach((offset,x,y) => {
			const blockType = matrix.view.getUint8(offset);
			if(blockType === 1){
				bck.fillStyle = 'red';
				bck.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
			}
		});
	};
	const resize = () => {
		blockSize = min(
			floor(window.innerWidth / matrix.width),
			floor(window.innerHeight / matrix.height)
		);
		canvasWidth = matrix.width * blockSize;
		canvasHeight = matrix.height * blockSize;
		canvases.forEach(canvas => {
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
		});
		canvasOffsetLeft = canvases[0].offsetLeft;
		canvasOffsetTop = canvases[0].offsetTop;
		drawBlocks();
	};

	const getBallInteractions = ball => {
		const actions = [];
		const nextPosition = ball.position.add(ball.speed);

		// The walls
		if(nextPosition.x < ball.radius){
			actions.push({
				deltaS: ball.speed.resizeToX(ball.radius - ball.position.x),
				action: () => {
					ball.speed.x *= -1;
				}
			});
		}else if(nextPosition.x > matrix.width - ball.radius){
			actions.push({
				deltaS: ball.speed.resizeToX((matrix.width - ball.radius) - ball.position.x),
				action: () => {
					ball.speed.x *= -1;
				}
			});
		}
		if(nextPosition.y < ball.radius){
			actions.push({
				deltaS: ball.speed.resizeToY(ball.radius - ball.position.y),
				action: () => {
					ball.speed.y *= -1;
				}
			});
		}

		// The paddle
		if(nextPosition.y + ball.radius > paddle.y){
			const deltaS = ball.speed.resizeToY(paddle.y - ball.position.y - ball.radius);
			const nextPosition2 = ball.position.add(deltaS);
			if(nextPosition2.x + ball.radius > paddle.x && nextPosition2.x - ball.radius < paddle.x + paddle.width){
				actions.push({
					deltaS: deltaS,
					action: () => {
						ball.speed = Vector.fromDir((paddle.x - nextPosition.x - ball.radius) / (paddle.width + ball.radius * 2) * PI - PI/2, ball.speed.length);
					}
				});
			}
		}

		// The blocks
		let [startX, endX] = [ball.position.x, nextPosition.x].sort((a,b) => a-b);
		let [startY, endY] = [ball.position.y, nextPosition.y].sort((a,b) => a-b);
		startX = max(floor(startX - ball.radius), 0);
		startY = max(floor(startY - ball.radius), 0);
		endX = min(ceil(endX + ball.radius), matrix.width);
		endY = min(ceil(endY + ball.radius), matrix.height);

		const checkedX = range(floor(ball.position.x - ball.radius), floor(ball.position.x + ball.radius));
		const checkedY = range(floor(ball.position.y - ball.radius), floor(ball.position.y + ball.radius));

		for(let x = startX; x < endX; x++){
			for(let y = startY; y < endY; y++){
				if(checkedX.includes(x) && checkedY.includes(y)) continue;
				const offset = matrix.getOffset(x, y);
				const type = matrix.view.getUint8(offset);
				if(type === 0) continue;
				if(window.debug) console.log('hit',x,y);
				const xDeltaS =
					ball.speed.x === 0 || floor(ball.position.x) === x
						? undefined
						: ball.speed.x < 0
							? ball.speed.resizeToX((x+1 + ball.radius) - ball.position.x)
							: ball.speed.resizeToX((x - ball.radius) - ball.position.x);
				const yDeltaS =
					ball.speed.y === 0 || floor(ball.position.y) === y
						? undefined
						: ball.speed.y < 0
							? ball.speed.resizeToY((y+1 + ball.radius) - ball.position.y)
							: ball.speed.resizeToY((y - ball.radius) - ball.position.y);
				// todo: corner detection thingy
				if(typeof xDeltaS !== 'undefined'){
					const nextPosition = ball.position.add(xDeltaS);
					if(nextPosition.y + ball.radius > y && nextPosition.y - ball.radius < y+1){
						if(window.debug) console.log('adding-x', xDeltaS);
						actions.push({
							deltaS: xDeltaS,
							action: () => {
								matrix.view.setUint8(offset, 0);
								bck.clearRect(x * blockSize, y * blockSize, blockSize, blockSize);
								ball.speed.x *= -1;
							}
						})
					}
				}
				if(typeof yDeltaS !== 'undefined'){
					const nextPosition = ball.position.add(yDeltaS);
					if(nextPosition.x + ball.radius > x && nextPosition.x - ball.radius < x+1){
						if(window.debug) console.log('adding-y', yDeltaS);
						actions.push({
							deltaS: yDeltaS,
							action: () => {
								matrix.view.setUint8(offset, 0);
								bck.clearRect(x * blockSize, y * blockSize, blockSize, blockSize);
								ball.speed.y *= -1;
							}
						});
					}
				}
				if(window.debug){
					ctx.fillStyle = 'rgba(50,255,0,0.5)';
					ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
				}
			}
		}
		return actions;
	};
	
	/*--- setup user interaction ---*/
	const listeners = [];
	listeners.push(listen(window, 'resize', resize));
	listeners.push(listen(document, 'pointermove', e => {
		console.log(e.x, e.y);
		paddle.x = between((e.x - canvasOffsetLeft) / blockSize - paddle.width / 2, 0, matrix.width - paddle.width);
	}));
	resize();

	/*--- main loop ---*/
	return (function loop(){
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		ctx.fillRect(paddle.x * blockSize, paddle.y * blockSize, paddle.width * blockSize, paddle.height * blockSize);
		for(const ball of balls){
			const ballInteractions = getBallInteractions(ball)
			if(window.debug){
				for(const ballInteraction of ballInteractions){
					const res = ballInteraction.deltaS.divideByVector(ball.speed)
					if(typeof res === 'undefined'){
						console.error('Invalid ballInteraction!', ballInteraction);
					}
					return typeof res !== 'undefined';
				}
				console.log(ballInteractions);
			}

			let shortestBallInteraction = ballInteractions[0];
			for(const ballInteraction of ballInteractions.slice(1)){
				if(abs(ballInteraction.deltaS.x) < abs(shortestBallInteraction.deltaS.x)){
					shortestBallInteraction = ballInteraction;
				}
			}
			// console.log('sbi', shortestBallInteraction);

			if(shortestBallInteraction){
				ball.position = ball.position.add(shortestBallInteraction.deltaS);
				shortestBallInteraction.action();
			}else{
				ball.position = ball.position.add(ball.speed);
			}
			ctx.beginPath();
			ctx.arc(ball.position.x * blockSize, ball.position.y * blockSize, ball.radius * blockSize, 0, PI*2);
			ctx.fill();
			ctx.closePath();
		}
		return reqAnimFrame(document, 'keydown').then(loop);
	})().then(sendThrough(result => {
		for(const listener of listeners){
			listener.destroy();
		}
	}));
};


/*--- the flow ---*/
fetch('./levels/test-level.txt')
	.then(resp => resp.text())
	.then(parseRawLevel)
	.then(start);