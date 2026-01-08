package com.myhome.shoppingbot.Repository

import com.myhome.shoppingbot.Data.ShoppingItem
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository

@Repository
interface ShoppingRepository : CrudRepository<ShoppingItem, Long>