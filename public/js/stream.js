const GO_BUTTON_START = "Publish";
const GO_BUTTON_STOP = "Stop";

var localVideo = null;
var remoteVideo = null;
var peerConnection = null;
var peerConnectionConfig = {
	'iceServers': []
};
var localStream = null;
var wsURL = "wss://5a99712c6614f.streamlock.net/webrtc-session.json";
var wsConnection = null;
var streamInfo = {
	applicationName: "webrtc",
	streamName: "myStream",
	sessionId: "[empty]"
};
var userData = {
	param1: "value1"
};
var videoBitrate = 360;
var audioBitrate = 64;
var videoFrameRate = "29.97";
var userAgent = null;
var newAPI = false;
var liveStreamObject = null;



var recordRTC;
var rtspURL = 'rtmp://a.rtmp.youtube.com/live2';
var recordState = false;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
var socket = null;
$(document).ready(function () {
	socket = io('http://localhost:8888');
	socket.on('message', function (m) {
		console.log('recv server message', m);
	});
	socket.on('fatal', function (m) {
		alert('Error:' + m);
		console.log(m);
		//mediaRecorder.stop();
		//should reload?
		recordState = false;
		recordRTC.stop();
	});
	socket.on('ffmpeg_stderr', function (m) {
		console.log('FFMPEG:' + m);
	});
	socket.on('disconnect', function () {
		console.log('ERROR: server disconnected!');
		//mediaRecorder.stop();
		recordState = false;
		recordRTC.stop();
	});
	console.log("ready!");
});

function pageReady() {
	var cookieWSURL = $.cookie("webrtcPublishWSURL");
	if (cookieWSURL === undefined) {
		cookieWSURL = wsURL;
		$.cookie("webrtcPublishWSURL", cookieWSURL);
	}
	console.log('cookieWSURL: ' + cookieWSURL);

	var cookieApplicationName = $.cookie("webrtcPublishApplicationName");
	if (cookieApplicationName === undefined) {
		cookieApplicationName = streamInfo.applicationName;
		$.cookie("webrtcPublishApplicationName", cookieApplicationName);
	}
	console.log('cookieApplicationName: ' + cookieApplicationName);

	var cookieStreamName = $.cookie("webrtcPublishStreamName");
	if (cookieStreamName === undefined) {
		cookieStreamName = streamInfo.streamName;
		$.cookie("webrtcPublishStreamName", cookieStreamName);
	}
	console.log('cookieStreamName: ' + cookieStreamName);

	var cookieVideoBitrate = $.cookie("webrtcPublishVideoBitrate");
	if (cookieVideoBitrate === undefined) {
		cookieVideoBitrate = videoBitrate;
		$.cookie("webrtcPublishVideoBitrate", cookieVideoBitrate);
	}
	console.log('cookieVideoBitrate: ' + cookieVideoBitrate);

	var cookieAudioBitrate = $.cookie("webrtcPublishAudioBitrate");
	if (cookieAudioBitrate === undefined) {
		cookieAudioBitrate = audioBitrate;
		$.cookie("webrtcPublishAudioBitrate", cookieAudioBitrate);
	}
	console.log('cookieAudioBitrate: ' + cookieAudioBitrate);

	var cookieVideoFrameRate = $.cookie("webrtcPublishVideoFrameRate");
	if (cookieVideoFrameRate === undefined) {
		cookieVideoFrameRate = videoFrameRate;
		$.cookie("webrtcPublishVideoFrameRate", cookieVideoFrameRate);
	}
	console.log('cookieVideoFrameRate: ' + cookieVideoFrameRate);

	$('#sdpURL').val(cookieWSURL);
	$('#applicationName').val(cookieApplicationName);
	$('#streamName').val(cookieStreamName);
	$('#videoBitrate').val(cookieVideoBitrate);
	$('#audioBitrate').val(cookieAudioBitrate);
	$('#videoFrameRate').val(cookieVideoFrameRate);
	userAgent = $('#userAgent').val().toLowerCase();

	if (userAgent == null) {
		userAgent = "unknown";
	}

	$("#buttonGo").attr('value', GO_BUTTON_START);

	localVideo = document.getElementById('localVideo');

	/*
		// firefox
		video: {
			width: { min: 1280, ideal: 1280, max: 1920 },
			height: { min: 720, ideal: 720, max: 1080 }
		},

		// chrome
		video: {
			mandatory: {
				minWidth: 1280,
				maxWidth: 1280,
				minHeight: 720,
				maxHeight: 720,
				minFrameRate: 30,
				maxFrameRate: 30
			}
		},

		video: {
			mandatory: {
				minAspectRatio: 1.7777777778
			}
		},

		video: true,
	*/

	var constraints = {
		video: true,
		audio: true,
	};

	if (navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
		newAPI = false;
	} else if (navigator.getUserMedia) {
		navigator.getUserMedia(constraints, getUserMediaSuccess, errorHandler);
	} else {
		alert('Your browser does not support getUserMedia API');
	}

	console.log("newAPI: " + newAPI);

}

function wsConnect(url) {
	wsConnection = new WebSocket(url);
	wsConnection.binaryType = 'arraybuffer';

	wsConnection.onopen = function () {
		console.log("wsConnection.onopen");

		peerConnection = new RTCPeerConnection(peerConnectionConfig);
		peerConnection.onicecandidate = gotIceCandidate;

		if (newAPI) {
			var localTracks = localStream.getTracks();
			for (localTrack in localTracks) {
				peerConnection.addTrack(localTracks[localTrack], localStream);
			}
		} else {
			peerConnection.addStream(localStream);
		}

		peerConnection.createOffer(gotDescription, errorHandler);
	}

	wsConnection.onmessage = function (evt) {
		console.log("wsConnection.onmessage: " + evt.data);

		var msgJSON = JSON.parse(evt.data);

		var msgStatus = Number(msgJSON['status']);
		var msgCommand = msgJSON['command'];

		if (msgStatus != 200) {
			$("#sdpDataTag").html(msgJSON['statusDescription']);
			stopPublisher();
		} else {
			$("#sdpDataTag").html("");

			var sdpData = msgJSON['sdp'];
			if (sdpData !== undefined) {
				console.log('sdp: ' + msgJSON['sdp']);

				peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData), function () {
					//peerConnection.createAnswer(gotDescription, errorHandler);
				}, errorHandler);
			}

			var iceCandidates = msgJSON['iceCandidates'];
			if (iceCandidates !== undefined) {
				for (var index in iceCandidates) {
					console.log('iceCandidates: ' + iceCandidates[index]);

					peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidates[index]));
				}
			}
		}

		if (wsConnection != null)
			wsConnection.close();
		wsConnection = null;
	}

	wsConnection.onclose = function () {
		console.log("wsConnection.onclose");
	}

	wsConnection.onerror = function (evt) {
		console.log("wsConnection.onerror: " + JSON.stringify(evt));

		$("#sdpDataTag").html('WebSocket connection failed: ' + wsURL);
		stopPublisher();
	}
}

function getUserMediaSuccess(stream) {
	console.log("getUserMediaSuccess: " + stream);
	localStream = stream;
	localVideo.src = window.URL.createObjectURL(stream);
	//console.log();
}

function startPublisher() {
	//wsURL = "rtmp://29e544.entrypoint.cloud.wowza.com/app-e35a:1935"; //$('#sdpURL').val();
	streamInfo.applicationName = "webrtc";
	streamInfo.streamName = "testStream";
	videoBitrate =360;
	audioBitrate = 64;
	videoFrameRate = "29.97";
	userAgent = "unknown";

	$.cookie("webrtcPublishWSURL", wsURL, {
		expires: 365
	});
	$.cookie("webrtcPublishApplicationName", streamInfo.applicationName, {
		expires: 365
	});
	$.cookie("webrtcPublishStreamName", streamInfo.streamName, {
		expires: 365
	});
	$.cookie("webrtcPublishVideoBitrate", videoBitrate, {
		expires: 365
	});
	$.cookie("webrtcPublishAudioBitrate", audioBitrate, {
		expires: 365
	});
	$.cookie("webrtcPublishVideoFrameRate", videoFrameRate, {
		expires: 365
	});

	console.log("startPublisher: wsURL:" + wsURL + " streamInfo:" + JSON.stringify(streamInfo));

	wsConnect(wsURL);

	$("#buttonGo").attr('value', GO_BUTTON_STOP);
}

function stopPublisher() {
	if (peerConnection != null)
		peerConnection.close();
	peerConnection = null;

	if (wsConnection != null)
		wsConnection.close();
	wsConnection = null;

	$("#buttonGo").attr('value', GO_BUTTON_START);

	console.log("stopPublisher");
}

function start() {
/*	if (peerConnection == null) {

		var path = "/api/v1/live_streams";
		var methode = 'POST';
		var body = {
			/*"live_stream": {
			"aspect_ratio_height": 1080,
			"aspect_ratio_width": 1920,
			"billing_mode": "pay_as_you_go",
			"broadcast_location": "asia_pacific_singapore",
			"encoder": "wowza_gocoder",
			"name": "test live stream",
			"transcoder_type": "transcoded",
			"closed_caption_type": "none",
			"delivery_method": "push",
			"delivery_type": "single-bitrate",
			"disable_authentication": false,
			"hosted_page": true,
			"hosted_page_description": "testing streaming",
			"low_latency": false,
			"player_logo_position": "top-right",
			"player_responsive": true,
			"player_type": "original_html5",
			"player_video_poster_image": "https://prod.s3.amazonaws.com/uploads/player/video_poster_image/23424/5bad28.jpg",
			"player_width": 640,
			"recording": true,
			"remove_hosted_page_logo_image": true,
			"remove_player_logo_image": true,
			"remove_player_video_poster_image": true,
			"source_url": localStream,
			"target_delivery_protocol": "hls-https",
			"use_stream_source": false,
			"video_fallback": false
			}*/
/*
			"name": "Streamv_test" + Date.now(),
			"transcoder_type": "transcoded",
			"billing_mode": "pay_as_you_go",
			"broadcast_location": "asia_pacific_singapore",
			"encoder": "other_rtmp",
			"delivery_method": "push",
			"aspect_ratio_width": 1920,
			"aspect_ratio_height": 1080,
			"recording": true,
			"disable_authentication": true
		};*/
		//console.log(body);
		//wsConnect();
		//create
		/**.then(function(value) {
				 // fulfillment
				}, function(reason) {
				// rejection
				}); */
		//APIWowza(path, methode, body);
		//startPublisher();
		//start record and send to ws server
		/*
				//start stream
				var path = '/api/v1/live_streams/' + liveStreamObject.live_stream.id + '/start';
				var methode = 'PUT';
				var body = {};
				APIWowza(path, methode, body);
				startRecoder();

				//fetch
				var path = '/live_streams/' + liveStreamObject.live_stream.id;
				var methode = 'GET';
				var body = {};
				APIWowza(path, methode, body);
				window.alert(liveStreamObject.live_stream.hosted_page_url);
		*/
		/*startRecoder();
	} else
		stopPublisher();*/

	if (peerConnection == null)
		startPublisher();
	else
		stopPublisher();
}

function gotIceCandidate(event) {
	if (event.candidate != null) {
		console.log('gotIceCandidate: ' + JSON.stringify({
			'ice': event.candidate
		}));
	}
}

function gotDescription(description) {
	var enhanceData = new Object();

	if (audioBitrate !== undefined)
		enhanceData.audioBitrate = Number(audioBitrate);
	if (videoBitrate !== undefined)
		enhanceData.videoBitrate = Number(videoBitrate);
	if (videoFrameRate !== undefined)
		enhanceData.videoFrameRate = Number(videoFrameRate);


	description.sdp = enhanceSDP(description.sdp, enhanceData);

	console.log('gotDescription: ' + JSON.stringify({
		'sdp': description
	}));

	peerConnection.setLocalDescription(description, function () {

		wsConnection.send('{"direction":"publish", "command":"sendOffer", "streamInfo":' + JSON.stringify(streamInfo) + ', "sdp":' + JSON.stringify(description) + ', "userData":' + JSON.stringify(userData) + '}');

	}, function () {
		console.log('set description error')
	});
}

function enhanceSDP(sdpStr, enhanceData) {
	var sdpLines = sdpStr.split(/\r\n/);
	var sdpSection = 'header';
	var hitMID = false;
	var sdpStrRet = '';

	for (var sdpIndex in sdpLines) {
		var sdpLine = sdpLines[sdpIndex];

		if (sdpLine.length <= 0)
			continue;

		sdpStrRet += sdpLine;

		if (sdpLine.indexOf("m=audio") === 0) {
			sdpSection = 'audio';
			hitMID = false;
		} else if (sdpLine.indexOf("m=video") === 0) {
			sdpSection = 'video';
			hitMID = false;
		} else if (sdpLine.indexOf("a=rtpmap") == 0) {
			sdpSection = 'bandwidth';
			hitMID = false;
		}

		if (sdpLine.indexOf("a=mid:") === 0 || sdpLine.indexOf("a=rtpmap") == 0) {
			if (!hitMID) {
				if ('audio'.localeCompare(sdpSection) == 0) {
					if (enhanceData.audioBitrate !== undefined) {
						sdpStrRet += '\r\nb=CT:' + (enhanceData.audioBitrate);
						sdpStrRet += '\r\nb=AS:' + (enhanceData.audioBitrate);
					}
					hitMID = true;
				} else if ('video'.localeCompare(sdpSection) == 0) {
					if (enhanceData.videoBitrate !== undefined) {
						sdpStrRet += '\r\nb=CT:' + (enhanceData.videoBitrate);
						sdpStrRet += '\r\nb=AS:' + (enhanceData.videoBitrate);
						if (enhanceData.videoFrameRate !== undefined) {
							sdpStrRet += '\r\na=framerate:' + enhanceData.videoFrameRate;
						}
					}
					hitMID = true;
				} else if ('bandwidth'.localeCompare(sdpSection) == 0) {
					var rtpmapID;
					rtpmapID = getrtpMapID(sdpLine);
					if (rtpmapID !== null) {
						var match = rtpmapID[2].toLowerCase();
						if (('vp9'.localeCompare(match) == 0) || ('vp8'.localeCompare(match) == 0) || ('h264'.localeCompare(match) == 0) ||
							('red'.localeCompare(match) == 0) || ('ulpfec'.localeCompare(match) == 0) || ('rtx'.localeCompare(match) == 0)) {
							if (enhanceData.videoBitrate !== undefined) {
								sdpStrRet += '\r\na=fmtp:' + rtpmapID[1] + ' x-google-min-bitrate=' + (enhanceData.videoBitrate) + ';x-google-max-bitrate=' + (enhanceData.videoBitrate);
							}
						}

						if (('opus'.localeCompare(match) == 0) || ('isac'.localeCompare(match) == 0) || ('g722'.localeCompare(match) == 0) || ('pcmu'.localeCompare(match) == 0) ||
							('pcma'.localeCompare(match) == 0) || ('cn'.localeCompare(match) == 0)) {
							if (enhanceData.audioBitrate !== undefined) {
								sdpStrRet += '\r\na=fmtp:' + rtpmapID[1] + ' x-google-min-bitrate=' + (enhanceData.audioBitrate) + ';x-google-max-bitrate=' + (enhanceData.audioBitrate);
							}
						}
					}
				}
			}
		}
		sdpStrRet += '\r\n';
	}
	return sdpStrRet;
}

function getrtpMapID(line) {
	var findid = new RegExp('a=rtpmap:(\\d+) (\\w+)/(\\d+)');
	var found = line.match(findid);
	return (found && found.length >= 3) ? found : null;
}

function errorHandler(error) {
	console.log(error);
}

//json format
function APIWowza(pathWowza, method, body) {
	//console.log(JSON.stringify({live_stream:body}));
	//console.log(JSON.parse(JSON.stringify({live_stream:body})));
	$.ajax({
		url: 'https://api-sandbox.cloud.wowza.com' + pathWowza,
		type: method,
		headers: {
			'wsc-api-key': 'WSACaDk3saJNrJRQ9J2Udcs1wr6YxhKPpFeuX7RDsYjGRqdTVcaM9QMlXmrN3430',
			'wsc-access-key': 'QyPF6WOVQ4cQ40R01QDPW2rEkKMJVeLh1sw2VrqBHG3fDVaYHGAd4R0jU2N52f09',
			'Content-Type': 'application/json'
		},
		data: JSON.stringify({
			live_stream: body
		}),
		success: function (data) {
			console.log(data);
			//output url
				console.log("rtsp==>>" + data.live_stream.source_connection_information.primary_server);
				liveStreamObject = data;
				rtspURL = data.live_stream.source_connection_information.primary_server + '/' + data.live_stream.source_connection_information.stream_name;
				recordState = true;
				var path = '/api/v1/live_streams/' + liveStreamObject.live_stream.id + '/start';
				var methode = 'PUT';
				var body = {};
				startStream(path,methode,body,liveStreamObject.live_stream.id);
/*
			//start stream
			var path = '/api/v1/live_streams/' + liveStreamObject.live_stream.id + '/start';
			var methode = 'PUT';
			var body = {};
			APIWowza(path, methode, body);
			startRecoder();

			//fetch
			var path = '/live_streams/' + liveStreamObject.live_stream.id;
			var methode = 'GET';
			var body = {};
			APIWowza(path, methode, body);
			window.alert(liveStreamObject.live_stream.hosted_page_url);
*/
		},
		error: function (data) {
			console.log(data.message);

		}

	});

}

//this function is can be recode data and send to ws server
function startRecoder() {

	// RecordRTC usage goes here
	socket.emit('config_rtmpDestination', rtspURL);
	socket.emit('start', 'start');
	/*var arrayBuffer;
	var fileReader = new FileReader();
	fileReader.onload = function() {
		arrayBuffer = this.result;
		console.log(arrayBuffer);
		socket.emit("binarystream", arrayBuffer);
	};
	//fileReader.readAsArrayBuffer(blob);

	var options = {
		recorderType: MediaStreamRecorder,
		mimeType: 'video/mp4\;codecs=vp9', // or video/webm\;codecs=h264 or video/webm\;codecs=vp9
		timeSlice: 100,
		ondataavailable: function (blob) {
			//send data to ws server
			//console.log(blob);
			socket.emit("binarystream", blob);
			$("#btn-solution").html('stop');
			$("#btn-solution").attr('class', 'btn btn-danger');
			var url = document.getElementById("url");
			url.innerText="https://player.cloud.wowza.com/hosted/fl7bysbb/player.html";
			//fileReader.readAsArrayBuffer(blob);
		}
	};
	recordRTC = RecordRTC(localStream, options);
	recordRTC.startRecording();*/
	recordRTC= new MediaRecorder(localStream);
	recordRTC.start(2000);
	recordRTC.onstop = function(e) {
		localStream.stop();
		//var button = document.getElementById("btn-solution");
		//button.innerText = "start";
		//button.className = "btn btn-success";
		$("#btn-solution").html('start');
		$("#btn-solution").attr('class', 'btn btn-success');
		var url = document.getElementById("url");
		url.innerText="";
	  //	url.innerText="";
		window.location.reload();
	}
	recordRTC.ondataavailable = function(e) {
		$("#btn-solution").html('stop');
		$("#btn-solution").attr('class', 'btn btn-danger');
		 //alert("http://127.0.0.1:1935/live/test123/playlist.m3u8");
		 //chunks.push(e.data);
		 var url = document.getElementById("url");
		 url.innerText="https://player.cloud.wowza.com/hosted/fl7bysbb/player.html";
	  socket.emit("binarystream",e.data);
	 /* var button = document.getElementById("btn-solution");
	  button.innerText = "live";
	  button.className = "btn btn-danger";*/

	//}
}

function startStream(pathWowza, method, body,id){
	$.ajax({
		url: 'https://api-sandbox.cloud.wowza.com' + pathWowza,
		type: method,
		headers: {
			'wsc-api-key': 'WSACaDk3saJNrJRQ9J2Udcs1wr6YxhKPpFeuX7RDsYjGRqdTVcaM9QMlXmrN3430',
			'wsc-access-key': 'QyPF6WOVQ4cQ40R01QDPW2rEkKMJVeLh1sw2VrqBHG3fDVaYHGAd4R0jU2N52f09',
			'Content-Type': 'application/json'
		},
		data: JSON.stringify({
			live_stream: body
		}),
		success: function (data) {
			console.log(data);
			//output url
/*
			//start stream
			var path = '/api/v1/live_streams/' + liveStreamObject.live_stream.id + '/start';
			var methode = 'PUT';
			var body = {};
			APIWowza(path, methode, body);
			startRecoder();
*/			startRecoder();
			//fetch
			var path = '/api/v1/live_streams/' + id;
			var methode = 'GET';
			var body = {};
			APIWowzaFetch(path, methode, body,id);

		},
		error: function (data) {
			console.log(data.message);

		}

	});
}

function APIWowzaFetch (path, method, body,id){
	$.ajax({
		url: 'https://api-sandbox.cloud.wowza.com' + path,
		type: method,
		headers: {
			'wsc-api-key': 'WSACaDk3saJNrJRQ9J2Udcs1wr6YxhKPpFeuX7RDsYjGRqdTVcaM9QMlXmrN3430',
			'wsc-access-key': 'QyPF6WOVQ4cQ40R01QDPW2rEkKMJVeLh1sw2VrqBHG3fDVaYHGAd4R0jU2N52f09',
			'Content-Type': 'application/json'
		},
		success: function (data) {
			console.log(data);
			console.log(data.live_stream.hosted_page_url);
			window.alert(data.live_stream.hosted_page_url);
			stop(data.live_stream.id);

		},
		error: function (data) {
			console.log(data.message);
		}

	});
}

function stop(){
	/*$.ajax({
		url: 'https://api-sandbox.cloud.wowza.com' +'/api/v1/live_streams/'+id+'/stop',
		type: 'PUT',
		headers: {
			'wsc-api-key': 'WSACaDk3saJNrJRQ9J2Udcs1wr6YxhKPpFeuX7RDsYjGRqdTVcaM9QMlXmrN3430',
			'wsc-access-key': 'QyPF6WOVQ4cQ40R01QDPW2rEkKMJVeLh1sw2VrqBHG3fDVaYHGAd4R0jU2N52f09',
			'Content-Type': 'application/json'
		},
		data: "",
		success: function (data) {
			console.log(data);
			//return data.live_stream.hosted_page_url;

		},
		error: function (data) {
			console.log(data.message);
			//return data.message;
		}

	});*/
	//recordRTC.stopRecording();
}
}