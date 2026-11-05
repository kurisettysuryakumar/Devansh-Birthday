package com.birthday.invitation.repository;

import com.birthday.invitation.model.Wish;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WishRepository extends MongoRepository<Wish, String> {
}
