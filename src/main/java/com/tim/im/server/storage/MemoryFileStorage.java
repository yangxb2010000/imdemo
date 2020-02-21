package com.tim.im.server.storage;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * @author xiaobing
 * @date 2020/2/18
 */
@Component
public class MemoryFileStorage {
    private Map<String, byte[]> blobMap = new HashMap<>();

    public String upload(byte[] blob) {
        String id = UUID.randomUUID().toString();
        blobMap.put(id, blob);
        return id;
    }

    public byte[] getBlob(String id) {
        return blobMap.get(id);
    }

    public void remove(String id) {
        blobMap.remove(id);
    }
}
