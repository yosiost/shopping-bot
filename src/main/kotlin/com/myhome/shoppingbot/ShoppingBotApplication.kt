package com.myhome.shoppingbot

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ShoppingBotApplication

fun main(args: Array<String>) {
	runApplication<ShoppingBotApplication>(*args)
}
