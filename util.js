class BufferMatrix{
	constructor(width, height, cellSize = 1){
		this.width = width;
		this.height = height;
		this.cellSize = cellSize;
		this.view = new DataView(new ArrayBuffer(width * height * cellSize));
	}
	getOffset(x, y = 0, byte = 0, neededBytes = 1){
		if(byte + neededBytes > this.cellSize){
			throw new Error('Byte overflow!');
		}
		return (y * this.width + x) * this.cellSize;
	}
	forEach(func){
		for(let x = 0; x < this.width; x++){
			for(let y = 0; y < this.height; y++){
				func(this.getOffset(x,y), x, y);
			}
		}
	}
	toString(){
		let str = '';
		const arr = new Uint8Array(this.view.buffer);
		for(let i = 0; i < arr.byteLength; i += 1){
			str += ('00' + arr[i].toString(16)).slice(-2);
			if((i+1) % (this.width * this.cellSize) === 0){
				str += '\n';
			}else if((i+1) % this.cellSize === 0){
				str += '  ';
			}
		}
		return str;
	}
}

const lineBreakRegex = /\r?\n/;
const digitRegex = /\d/;
const versionRegex = /^v(\d+)$/;
const parseRawLevel = rawLevel => {
	const [rawVersion, ...lines] = rawLevel.split(lineBreakRegex);
	const versionMatch = rawVersion.match(versionRegex);
	if(!versionMatch){
		console.error(`Unsupported version string "${rawVersion}"!`);
		return;
	}
	
	const version = versionMatch[1];
	if(version === '0'){
		console.log(`Level parsing using v${version}...`);
		const matrix = new BufferMatrix(lines[0].length, lines.length, 1);
		for(let y = 0; y < matrix.height; y++){
			for(let x = 0; x < matrix.width; x++){
				const type = parseInt(lines[y][x]);
				if(Number.isFinite(type)){
					matrix.view.setUint8(matrix.getOffset(x, y, 0, 1), type + 1);
				}
			}
		}
		return matrix;
	}
};

const reqAnimFrame = () => new Promise(requestAnimationFrame);
const sendThrough = func => value => {
	func(value);
	return value;
};
const listen = (element, ...args) => {
	element.addEventListener(...args);
	return{
		destroy: () => {
			element.removeEventListener(...args);
		}
	}
};
const waitForEvent = (element, type) => new Promise(resolve => {
	element.addEventListener(type, resolve, {once: true});
});
const between = (value, min, max) => {
	if(value < min) return min;
	if(value > max) return max;
	return value;
};
class Vector{
	constructor(x,y){
		this.x = x;
		this.y = y;
	}
	static fromDir(dir, length){
		return new Vector(Math.sin(dir) * length, Math.cos(dir) * length);
	}
	add(vector){
		return new Vector(this.x + vector.x, this.y + vector.y);
	}
	get length(){
		if(this.hasOwnProperty('_length')) return this._length;
		return this._length = Math.sqrt(this.x**2 + this.y**2);
	}
	normalize(){
		return new Vector(this.x / this._length, this.y / this._length);
	}
	multiply(n){
		return new Vector(this.x * n, this.y * n);
	}
	resize(n){
		return this.normalize().multiply(n);
	}
	resizeToX(x){
		return new Vector(x, (this.y / this.x) * x);
	}
	resizeToY(y){
		return new Vector((this.x / this.y) * y, y);
	}
	/** Only works if the two vectors are laying on the same line. */
	divideByVector(vec){
		const x = this.x / vec.x;
		const y = this.y / vec.y;
		if(Math.abs(x - y) > 0.0001) return undefined;
		return x;
	}
}
const doNothing = () => {};
const id = x => x;
const isSameSign = (a,b) => (a < 0 && b < 0) || (a === 0 && b === 0) || (a > 0 && b > 0);
const range = (from, to, step = 1) => {
	const arr = [];
	for(let i = from; i <= to; i += step){
		arr.push(i);
	}
	return arr;
};

export {parseRawLevel, BufferMatrix, reqAnimFrame, sendThrough, listen, between, Vector, waitForEvent, doNothing, id, isSameSign, range};