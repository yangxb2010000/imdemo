package com.tim.im.server.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * User: xiaobing
 * Date: 2020/2/23 1:52
 * Description:
 */
@RestController
@RequestMapping("/talk")
public class TalkController {
    private boolean isRequested = false;
    private ScheduledFuture<?> autoReleaseFuture;
    ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor();

    @RequestMapping("/request")
    public boolean request() {
        if (!isRequested) {
            isRequested = true;
            if (autoReleaseFuture != null) {
                autoReleaseFuture.cancel(false);
            }

            autoReleaseFuture = executorService.schedule(() -> {
                isRequested = false;
            }, 30, TimeUnit.SECONDS);
            return true;
        }
        return false;
    }

    @RequestMapping("/release")
    public void release() {
        isRequested = false;
    }
}