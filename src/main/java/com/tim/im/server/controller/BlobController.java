package com.tim.im.server.controller;

import com.tim.im.server.storage.VoiceStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.yeauty.annotation.RequestParam;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * @author xiaobing
 * @date 2020/2/18
 */

@RestController
@RequestMapping("/blob")
public class BlobController {
    @Autowired
    VoiceStorage voiceStorage;

    @RequestMapping("/upload")
    public String upload(@RequestParam("uploadFile") MultipartFile uploadFile) {
        try {
            String id = voiceStorage.addVoice(uploadFile.getBytes());
            return id;
        } catch (IOException e) {
            e.printStackTrace();
        }

        return null;
    }

    @RequestMapping("/get")
    public void get(@RequestParam("id") String id, HttpServletResponse response) throws IOException {
        byte[] blob = voiceStorage.receiveVoice(id);
        if (blob == null) {
            return;
        }

        response.getOutputStream().write(blob);
    }
}
