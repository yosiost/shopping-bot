package com.myhome.shoppingbot.Repository

import com.myhome.shoppingbot.Data.AppUser
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository

@Repository
interface AppUserRepository : CrudRepository<AppUser, Long> {
    fun findByEmail(email: String): AppUser?
}
