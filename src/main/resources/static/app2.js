var ws = null;
var audioContext = null;
var recording = false;
var connectStatus = document.getElementById("connectStatus");
var connectButton = document.getElementById("connectButton");


function connect() {
    if ("WebSocket" in window) {
        // Let us open a web socket
        var ip = window.location.host.split(":")[0];
        var isProd = 'https:' == document.location.protocol ? true : false;
        var websocketUri
        if (isProd) {
            websocketUri = 'wss://' + ip + '/intercom/ws/im';
        } else {
            websocketUri = 'ws://' + ip + ':9998/ws/im';
        }
        ws = new WebSocket(websocketUri);

        ws.onopen = function () {
            console.log("websocket connected");
            connectStatus.innerHTML = "与服务器连接成功";
        };

        ws.onmessage = function (evt) {
            var reader = new FileReader();
            if (evt.data instanceof Blob) {
                console.log("received data");
                reader.readAsArrayBuffer(evt.data);
                reader.onload = function (e) {
                    var data = new Uint8Array(reader.result);
                    window.player.feed(data);
                }
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

connectButton.addEventListener("click", function () {
    init();
});

function init() {
    connect();

    initPlayer();
    document.getElementById("recordButton").addEventListener("mousedown", function () {
        startRecord();
    });

    document.getElementById("recordButton").addEventListener("mouseup", function () {
        stopRecord();
    });
}

function initRecord() {
    window.navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(function (mediaStream) {
        var input = audioContext.createMediaStreamSource(mediaStream);   // 媒体流音频源
        var processor = input.context.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = function (e) {
            if (!recording) {
                return;
            }

            var channelData = e.inputBuffer.getChannelData(0);  // PCM数据
            ws.send(convertFloat32ToInt16(channelData)); //发送pcm转wav音频数据
        };
        input.connect(processor);
        processor.connect(input.context.destination);
    });
}

function startRecord() {
    if (!audioContext) {
        audioContext = new AudioContext();
        initRecord();
    }

    ajaxGet("/talk/request", function (result) {
        if (result == "true") {
            console.log("startRecord");
            recording = true;
        }
    })
}

function stopRecord() {
    recording = false;
    ajaxGet("/talk/release", function (result) {
        console.log("release result: ", result);
        console.log("stopRecord");
    })

}

function initPlayer() {
    window.player = new PCMPlayer({
        encoding: '16bitInt',
        channels: 2,
        sampleRate: 8000,
        flushingTime: 2000
    });
}

function convertFloat32ToInt16(buffer) {
    l = buffer.length;
    buf = new Int16Array(l);

    while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }

    return buf.buffer;
}

function ajaxGet(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function (e) {
        if (this.readyState === 4) {
            callback(e.target.responseText);
        }
    };
    xhr.open("GET", url, true);
    xhr.send();
}