package com.tim.im.server.socket;

import io.netty.handler.codec.http.HttpHeaders;
import io.netty.handler.timeout.IdleStateEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.MultiValueMap;
import org.yeauty.annotation.*;
import org.yeauty.pojo.Session;

import java.io.IOException;
import java.util.Map;

/**
 * @author xiaobing
 * @date 2020/2/18
 */

@ServerEndpoint(path = "/ws/im", port = "9998")
public class IMWebSocket {

    @Autowired
    IMManager imManager;

    @BeforeHandshake
    public void handshake(Session session, HttpHeaders headers, @RequestParam String req, @RequestParam MultiValueMap reqMap, @PathVariable String arg, @PathVariable Map pathMap) {
//        session.setSubprotocols("stomp");
//        if (!req.equals("ok")) {
//            System.out.println("Authentication failed!");
//            session.close();
//        }
    }

    @OnOpen
    public void onOpen(Session session, HttpHeaders headers, @RequestParam String req, @RequestParam MultiValueMap reqMap, @PathVariable String arg, @PathVariable Map pathMap) {
        System.out.println("new connection");
        imManager.registerSession(session);
    }

    @OnClose
    public void onClose(Session session) throws IOException {
        imManager.disposeSession(session);
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        if (throwable != null) {
            throwable.printStackTrace();
        }
    }

    @OnMessage
    public void onMessage(Session session, String message) {
//        Message messageObj = JSON.parseObject(message, Message.class);
//        if (messageObj.getType() == Message.AudioType) {
//            Message.AudioContent audioContent = JSONObject.parse(messageObj.getContent().toJSONString(), Message.AudioContent.class);
//
//        }
        imManager.broadcastExcept(message, session);
    }

    @OnBinary
    public void onBinary(Session session, byte[] bytes) {
        for (byte b : bytes) {
            System.out.println(b);
        }
        session.sendBinary(bytes);
    }

    @OnEvent
    public void onEvent(Session session, Object evt) {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent idleStateEvent = (IdleStateEvent) evt;
            switch (idleStateEvent.state()) {
                case READER_IDLE:
                    System.out.println("read idle");
                    break;
                case WRITER_IDLE:
                    System.out.println("write idle");
                    break;
                case ALL_IDLE:
                    System.out.println("all idle");
                    break;
                default:
                    break;
            }
        }
    }
}
