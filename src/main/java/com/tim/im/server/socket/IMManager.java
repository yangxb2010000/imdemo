package com.tim.im.server.socket;

import io.netty.channel.ChannelId;
import org.springframework.stereotype.Component;
import org.yeauty.pojo.Session;

import java.util.HashMap;
import java.util.Map;

/**
 * @author xiaobing
 * @date 2020/2/18
 */
@Component
public class IMManager {
    private Map<ChannelId, Session> sessionMap = new HashMap<>();

    public void registerSession(Session session) {
        sessionMap.put(session.id(), session);
    }

    public void disposeSession(Session session) {
        sessionMap.remove(session.id());
    }

    public void broadcastExcept(String message, Session exceptOne) {
        for (Session session : sessionMap.values()) {
            if (exceptOne == null || !exceptOne.equals(session)) {
                session.sendText(message);
            }
        }
    }
}
