const charCodes = new Map([
	['.', 0x00],
	['0', 0x01]
])

const processLines = lines => {
	const width = lines[0].length;
	const height = lines.length;

	return Buffer.concat([
		Buffer.from([width, height]),
		Buffer.from([...lines.join('')].map(char => charCodes.get(char)))
	]);
};

module.exports = input => processLines(input.split(/\r?\n/));

/*
let buffer = Buffer.alloc(0);
process.stdin.on('data', data => {
	buffer = Buffer.concat([buffer, data]);
});
process.stdin.on('end', () => {
	process.stdout.write(processLines(buffer.toString()));
});
*/