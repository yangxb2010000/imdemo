//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");
var connectStatus = document.getElementById("connectStatus");
var remoteAudioList = document.getElementById("remoteAudioList");

//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

function startRecording() {
    console.log("recordButton clicked");

    /*
        Simple constraints object, for more advanced audio features see
        https://addpipe.com/blog/audio-constraints-getusermedia/
    */

    var constraints = {audio: true, video: false}

    /*
       Disable the record button until we get a success or fail from getUserMedia()
   */

    recordButton.disabled = true;
    stopButton.disabled = false;
    pauseButton.disabled = false
    stopPlayer();

    /*
        We're using the standard promise based getUserMedia()
        https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    */

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

        /*
            create an audio context after getUserMedia is called
            sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
            the sampleRate defaults to the one set in your OS for your playback device

        */
        audioContext = new AudioContext();

        //update the format
        document.getElementById("formats").innerHTML = "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz"

        /*  assign to gumStream for later use  */
        gumStream = stream;

        /* use the stream */
        input = audioContext.createMediaStreamSource(stream);

        /*
            Create the Recorder object and configure to record mono sound (1 channel)
            Recording 2 channels  will double the file size
        */
        rec = new Recorder(input, {numChannels: 1})

        //start the recording process
        rec.record()

        console.log("Recording started");

    }).catch(function (err) {
        console.log(err);
        //enable the record button if getUserMedia() fails
        recordButton.disabled = false;
        stopButton.disabled = true;
        pauseButton.disabled = true
        continuePlayer();
    });
}

function pauseRecording() {
    console.log("pauseButton clicked rec.recording=", rec.recording);
    if (rec.recording) {
        //pause
        rec.stop();
        pauseButton.innerHTML = "Resume";
    } else {
        //resume
        rec.record()
        pauseButton.innerHTML = "Pause";
    }
}

function stopRecording() {
    console.log("stopButton clicked");

    //disable the stop button, enable the record too allow for new recordings
    stopButton.disabled = true;
    recordButton.disabled = false;
    pauseButton.disabled = true;

    //reset button just in case the recording is stopped while paused
    pauseButton.innerHTML = "Pause";

    //tell the recorder to stop the recording
    rec.stop();

    //stop microphone access
    gumStream.getAudioTracks()[0].stop();

    //create the wav blob and pass it on to createDownloadLink
    rec.exportWAV(transferByWebsocket);

    continuePlayer();
}

function createDownloadLink(blob) {

    var url = URL.createObjectURL(blob);
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');

    //name of .wav file to use during upload and download (without extendion)
    var filename = new Date().toISOString();

    //add controls to the <audio> element
    au.controls = true;
    au.src = url;

    //save to disk link
    link.href = url;
    link.download = filename + ".wav"; //download forces the browser to donwload the file using the  filename
    link.innerHTML = "Save to disk";

    //add the new audio element to li
    li.appendChild(au);

    //add the filename to the li
    li.appendChild(document.createTextNode(filename + ".wav "))

    //add the save to disk link to li
    li.appendChild(link);

    //upload link
    var upload = document.createElement('a');
    upload.href = "#";
    upload.innerHTML = "Upload";
    upload.addEventListener("click", function (event) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (this.readyState === 4) {
                console.log("Server returned: ", e.target.responseText);
            }
        };
        var fd = new FormData();
        fd.append("audio_data", blob, filename);
        xhr.open("POST", "upload.php", true);
        xhr.send(fd);
    })
    li.appendChild(document.createTextNode(" "))//add a space in between
    li.appendChild(upload)//add the upload link to li

    //add the li element to the ol
    recordingsList.appendChild(li);
}

function transferByWebsocket(blob) {
    toBase64(blob, function (base64) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (this.readyState === 4) {
                var audioId = e.target.responseText;
                if (ws != null) {
                    ws.send(JSON.stringify({
                        type: 2,
                        data: {
                            id: audioId
                        }
                    }));
                } else {
                    alert("与服务器连接断开，请重试")
                }
            }
        };
        var fd = new FormData();
        fd.append("uploadFile", blob, new Date().toISOString());
        xhr.open("POST", "/blob/upload", true);
        xhr.send(fd);
    })
}

function toBase64(blob, callback) {
    var reader = new FileReader();
    reader.onload = function () {
        var dataUrl = reader.result;
        var base64 = dataUrl.split(',')[1];
        callback(base64);
    };
    reader.readAsDataURL(blob);
}

function connect() {
    if ("WebSocket" in window) {
        // Let us open a web socket
        var ip = window.location.host.split(":")[0];
        window.ws = new WebSocket("ws://" + ip + ":9998/ws/im");

        ws.onopen = function () {
            console.log("websocket connected");

            connectStatus.innerHTML = "与服务器连接成功";
        };

        ws.onmessage = function (evt) {
            console.log("received data: " + evt.data);
            var message = JSON.parse(evt.data);
            if (message.type == 2) {
                playWav(message.data.id);
            }
        };

        ws.onclose = function () {
            ws = null;

            console.log("websocket closed");

            connectStatus.innerHTML = "与服务器建立连接中...";

            connect();
        };
    } else {

        // The browser doesn't support WebSocket
        alert("WebSocket NOT supported by your Browser!");
    }
}


var audioList = [];
var isPlaying = false;
var shouldStop = false;

// remoteAudio.addEventListener("ended", function () {
//     if (audioList.length > 0) {
//         remoteAudio.setAttribute("src", "/blob/get?id=" + audioList.shift());
//         remoteAudio.load();
//         isPlaying = true;
//     }
// })

function playWav(audioId) {
    var audioEle = document.createElement("audio");
    audioEle.setAttribute("src", "/blob/get?id=" + audioId);
    audioEle.setAttribute("autoplay", "true");
    var id = "remote-audio-" + audioId;
    audioEle.setAttribute("id", id);
    audioEle.addEventListener("ended", function (ev) {
        console.log("ended", ev);
        remoteAudioList.removeChild(document.getElementById(id));
    })

    remoteAudioList.append(audioEle);
}

function stopPlayer() {
    // shouldStop = true;
    // if (isPlaying) {
    //     remoteAudio.pause();
    // }
}


function continuePlayer() {
    // shouldStop = false;
    // remoteAudio.play().then(function (value) {
    //     isPlaying = true;
    // });
}


connect();