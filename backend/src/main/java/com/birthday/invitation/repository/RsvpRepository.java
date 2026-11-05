package com.birthday.invitation.repository;

import com.birthday.invitation.model.Rsvp;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RsvpRepository extends MongoRepository<Rsvp, String> {
}
