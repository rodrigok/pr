#!/usr/bin/env node

// USAGE
// pr.js <pr_number>

const https = require('https');
const _execSync = require('child_process').execSync;

function execSync(command) {
	console.log(command);
	return _execSync(command).toString();
}

const prNumber = process.argv[2];

if (!prNumber || isNaN(parseInt(prNumber))) {
	console.error('PR number is required');
	process.exit(1);
}

const originUrl = execSync('git remote get-url origin');
const originRepo = originUrl.replace('https://github.com/', '').replace(/\.git\n?$/, '');

const options = {
	hostname: 'api.github.com',
	port: 443,
	path: '/repos/'+originRepo+'/pulls/'+prNumber,
	method: 'GET',
	headers: {
		'User-Agent': 'Node app'
	}
};

console.log(options);

function configBranch(ssh_url, ref, login) {
	const remotes = execSync('git remote').split('\n');

	if (remotes.indexOf(login) === -1) {
		console.log(execSync(`git remote add ${login} ${ssh_url}`));
	}

	console.log(execSync(`git fetch ${login}`));

	const branchName = `pr/${prNumber}-${login}-${ref}`;

	if (execSync(`git branch --list ${branchName}`).trim() === '') {
		console.log(execSync(`git checkout -b pr/${prNumber}-${login}-${ref} --track ${login}/${ref}`));
	} else {
		console.log(execSync(`git checkout pr/${prNumber}-${login}-${ref}`));
		console.log(execSync('git pull'));
	}
}

const req = https.request(options, (res) => {
	const buffer = [];

	res.on('data', (d) => {
		buffer.push(d);
	});

	res.on('end', () => {
		const data = JSON.parse(Buffer.concat(buffer).toString());

		if (data.message) {
			console.error(data.message);
			process.exit(1);
		}

		configBranch(data.head.repo.ssh_url, data.head.ref, data.user.login);
	});
});

req.end();

req.on('error', (e) => {
	console.error(e);
});