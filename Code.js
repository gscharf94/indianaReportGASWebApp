const jobFolderId = "1rRZJd4DRD5q91FlWr7oLzFh7JAN8POx4";
let ticketInfo = {};

function doGet() {
	return HtmlService
		.createTemplateFromFile('index')
		.evaluate();
}

function include(filename) {
	return HtmlService
		.createHtmlOutputFromFile(filename)
		.getContent();
}

function getTextPicsFolders(folderId) {
	let childFolders = DriveApp.getFolderById(folderId).getFolders();
	let textId, picId;
	while (childFolders.hasNext()) {
		let childFolder = childFolders.next();
		if (childFolder.getName() == "ticket_text") {
			textId = childFolder.getId();
		}
		if (childFolder.getName() == "ticket_pics") {
			picId = childFolder.getId();
		}
	}
	return [textId, picId];
}

function getTicketPic(folderId, ticketId) {
	let fileName = `${String(ticketId).padStart(3,'0')}.png`;
	let file = DriveApp.getFolderById(folderId).getFilesByName(fileName).next();

	return file.getId();
}

function getTicketText(folderId, ticketId) {
	let fileName = `${String(ticketId).padStart(3,'0')}.txt`;
	let file = DriveApp.getFolderById(folderId).getFilesByName(fileName).next();
	return file.getId();
}

function fillInTicketInfo(jobData) {
	let jobFolders = DriveApp.getFolderById(jobFolderId).getFolders();
	let folders = {};
	while (jobFolders.hasNext()) {
		let job = jobFolders.next();
		let id = job.getName().split(" ")[0];
		folders[id] = job.getId();
	}

	for (const job in folders) {
		let [textFolderId, picFolderId] = getTextPicsFolders(folders[job]);
		for (const ticketNum in jobData[job]) {
			let tickId = jobData[job][ticketNum].id;
			let picId = getTicketPic(picFolderId, tickId);
			let textId = getTicketText(textFolderId, tickId);
			ticketInfo[ticketNum] = {
				picId: picId,
				textId: textId,
			};
		}
	}

	console.log(folders);
}

function getJobs() {

	let homeFolder = DriveApp.getFolderById('18x_1tYYO8Za2XUuZNt4PX8gytfTeKpY2');
	let files = homeFolder.getFiles();

	let jobData = {};
	let responseData = {};

	while (files.hasNext()) {
		let file = files.next();
		if (file.getName().indexOf('compiledData') != -1) {
			let json = file.getBlob().getDataAsString('utf8');
			json = JSON.parse(json);
			let name = file.getName().split(" ")[0];
			jobData[name] = json;
		} else if (file.getName().indexOf('tInfo') != -1) {
			let json = file.getBlob().getDataAsString('utf8');
			json = JSON.parse(json);
			let name = file.getName().split(" ")[1];
			responseData[name] = json;
		}
	}

	fillInTicketInfo(jobData);

	console.log('ticketInfo');
	console.log(ticketInfo);

	for (const job in responseData) {
		for (const ticketNum in responseData[job]) {
			if (ticketNum == "") {
				continue;
			}
			console.log(`setting responses for ticket: ${ticketNum}`);
			ticketInfo[ticketNum].responses = responseData[job][ticketNum];
		}
	}

	let output = ``;
	for (const job in jobData) {
		let jobHtml = createJobCollapseable(jobData[job], job);
		output += jobHtml;
	}

	// console.log(output);
	return [output, JSON.stringify(ticketInfo)];
}

function generateResponseTable(tick) {
	let responseArr = tick.responses;
	let tickNum = tick.ticketNumber;

	let html = `<table id="${tickNum}Table">`;
	html += `<tr><th>Utility</th><th>Type</th><th>Response</th><th>Notes</th></tr>`;
	for (const row of responseArr) {
		let defaultReady = "notReady";
		let response = row[2];
		if (response[0] == '2' || response[0] == '1') {
			defaultReady = "ready";
		}
		let htmlRow = `<tr class="${defaultReady}">`;
		for (const item of row) {
			htmlRow += `<td>${item}</td>`;
		}
		htmlRow += `</td>`;
		html += htmlRow;
	}
	html += `</table>`;
	return html;
}

function getExpirationDate(date) {
	let dateObj = new Date(date);
	dateObj.setDate(dateObj.getDate() + 20);
	return `${dateObj.getMonth()+1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
}

function loadImage(ticket, ticketInfo) {
	ticketInfo = JSON.parse(ticketInfo);
	// console.log(`loadImage: ${ticket}`);
	// console.log(ticketInfo);
	let picId = ticketInfo[ticket].picId;
	let textId = ticketInfo[ticket].textId;
	let bytes = DriveApp.getFileById(picId).getBlob().getBytes();
	let ticketText = DriveApp.getFileById(textId).getBlob().getDataAsString();

	let tableHTML = generateResponseTable(ticketInfo[ticket].responses);

	return [Utilities.base64Encode(bytes), ticket, ticketText, tableHTML];
}

function createJobCollapseable(jobData, jobName) {
	let jobId = jobName.slice(1);

	let html = `<button type="button" class="jobButton" onclick="toggleJob('${jobId}')">${jobName}</button>`;
	html += `<div class="jobContent" id="jobInfo${jobId}">`;

	html += `<ul class="tickList">`
	for (const ticket in jobData) {
		let finished = "";
		if (jobData[ticket].finished == "true") {
			finished = "finished";
		}
		let finishedStr = "";
		if (finished == "finished") {
			finishedStr = " | Done ✔️";
		}
		html += `<li><button class="ticketButton ${finished}" onclick="expandTicket('${ticket}', '${jobName}')">${ticket} Exp: ${getExpirationDate(jobData[ticket].entryDate)} - ${jobData[ticket].street}, ${jobData[ticket].crStreet} - ${jobData[ticket].page}${finishedStr}</button></li>`;
		html += `<div class="ticketContent" id="${ticket}Content"><img class="ticketImage" id="${ticket}Image"><p class="ticketText" id="${ticket}Text"></p><div class="responseTable" id="${ticket}Table"></div></div>`;
	}
	html += `</ul>`;

	html += "</div><br>"
	// let html = `<div class="jobInfoContent" id="jobInfo${jobId}"><p id="test">Empty for now...</p></div>`;

	return html;
}

function expandTicketGAS(ticket) {
	return 'ok..';
}