package com.birthday.invitation.controller;

import java.util.Map;
import com.mongodb.client.MongoClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final MongoClient mongoClient;

    public HealthController(MongoClient mongoClient) {
        this.mongoClient = mongoClient;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        try {
            mongoClient.getDatabase("birthday-event-planner").runCommand(new org.bson.Document("ping", 1));
            return ResponseEntity.ok(Map.of("status", "ok", "database", "connected"));
        } catch (Exception exception) {
            return ResponseEntity.status(503).body(Map.of("status", "unavailable", "database", "disconnected"));
        }
    }
}
