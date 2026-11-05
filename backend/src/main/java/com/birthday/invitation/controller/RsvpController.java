package com.birthday.invitation.controller;

import com.birthday.invitation.model.Rsvp;
import com.birthday.invitation.repository.RsvpRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RsvpController {
    private final RsvpRepository rsvpRepository;

    public RsvpController(RsvpRepository rsvpRepository) {
        this.rsvpRepository = rsvpRepository;
    }

    @GetMapping("/rsvp")
    public List<Rsvp> getAllRsvps() {
        return rsvpRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @PostMapping("/rsvp")
    public ResponseEntity<Rsvp> createRsvp(@Valid @RequestBody Rsvp rsvp) {
        rsvp.setAttending(rsvp.getAttending() == null ? "" : rsvp.getAttending().trim().toLowerCase());
        Rsvp saved = rsvpRepository.save(rsvp);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
