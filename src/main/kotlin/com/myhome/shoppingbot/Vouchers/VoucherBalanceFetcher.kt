package com.myhome.shoppingbot.Vouchers

interface VoucherBalanceFetcher {
    fun supports(providerName: String): Boolean
    fun fetch(voucherNumber: String): Double?
}