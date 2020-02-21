package com.tim.im.server.storage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * @author xiaobing
 * @date 2020/2/21
 */
@Component
public class VoiceStorage {
    @Autowired
    private MemoryFileStorage memoryFileStorage;

    private ScheduledExecutorService scheduledExecutorService = Executors.newSingleThreadScheduledExecutor();
    private ConcurrentHashMap<String, DisposeVoiceEntry> voiceDisposeMap = new ConcurrentHashMap<>();

    public String addVoice(byte[] voice) {
        String id = memoryFileStorage.upload(voice);

        DisposeVoiceEntry voiceEntry = new DisposeVoiceEntry(id);
        // 默认voice的有效期只有5s，5s之后就会被清除
        ScheduledFuture<?> disposeFuture = scheduledExecutorService.schedule(() -> {
            memoryFileStorage.remove(id);
        }, 5, TimeUnit.SECONDS);
        voiceEntry.setDisposeFuture(disposeFuture);

        voiceDisposeMap.put(id, voiceEntry);
        return id;
    }

    public void setVoiceReceiverCount(String id, int receiverCount) {
        if (receiverCount <= 0) {
            memoryFileStorage.remove(id);
            voiceDisposeMap.remove(id);
            return;
        }

        DisposeVoiceEntry voiceEntry = voiceDisposeMap.get(id);
        if (voiceEntry == null) {
            return;
        }

        voiceEntry.updateReceiverCount(receiverCount);

        return;
    }

    public byte[] receiveVoice(String id) {
        byte[] voice = memoryFileStorage.getBlob(id);
        DisposeVoiceEntry voiceEntry = voiceDisposeMap.get(id);
        if (voiceEntry == null) {
            return voice;
        }

        voiceEntry.retriveOne();

        return voice;
    }

    class DisposeVoiceEntry {
        private String id;

        private ScheduledFuture<?> disposeFuture;

        /**
         * default value is -1
         */
        private int receiverCount = -1;

        /**
         * 接受者已经获取过的数量
         */
        private AtomicInteger retriveCount;

        private volatile boolean isDisposed = false;

        public DisposeVoiceEntry(String id) {
            this.id = id;
            this.retriveCount = new AtomicInteger(receiverCount);
        }

        public void retriveOne() {
            this.retriveCount.incrementAndGet();

            this.checkDispose();
        }

        public synchronized boolean checkDispose() {
            if (!isDisposed
                    && this.receiverCount >= 0
                    && this.retriveCount.get() >= this.receiverCount) {
                memoryFileStorage.remove(id);
                voiceDisposeMap.remove(id);
                if (this.disposeFuture != null) {
                    this.disposeFuture.cancel(false);
                }

                isDisposed = true;

                return true;
            }

            return false;
        }

        public ScheduledFuture<?> getDisposeFuture() {
            return disposeFuture;
        }

        public void setDisposeFuture(ScheduledFuture<?> disposeFuture) {
            this.disposeFuture = disposeFuture;
        }

        public int getReceiverCount() {
            return receiverCount;
        }

        public void updateReceiverCount(int receiverCount) {
            this.receiverCount = receiverCount;

            this.checkDispose();
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }
    }


}
