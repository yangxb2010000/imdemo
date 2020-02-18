package com.tim.im.server.socket;

import com.alibaba.fastjson.JSONObject;

/**
 * @author xiaobing
 * @date 2020/2/18
 */
public class Message {
    public static final int AudioType = 2;
    private int type;
    private JSONObject content;

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public JSONObject getContent() {
        return content;
    }

    public void setContent(JSONObject content) {
        this.content = content;
    }

    public static class AudioContent{
        private String src;

        public String getSrc() {
            return src;
        }

        public void setSrc(String src) {
            this.src = src;
        }
    }
}

