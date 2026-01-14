package com.myhome.shoppingbot.Service

import com.myhome.shoppingbot.Data.Voucher
import com.myhome.shoppingbot.Repository.VoucherRepository
import com.twilio.Twilio
import com.twilio.rest.api.v2010.account.Message
import com.twilio.type.PhoneNumber
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Service
class NotificationService (private val voucherRepository: VoucherRepository) {
    private val logger = LoggerFactory.getLogger(NotificationService::class.java)

    @Value("\${twilio.accountsid}") private lateinit var accountsId: String
    @Value("\${twilio.auth.token}") private lateinit var authToken: String
    @Value("\${twilio.whatsapp.from}") private lateinit var fromNumber: String
    @Value("\${notification.recipient}") private lateinit var recipientNumber: String

    @Scheduled(cron = "0 0 9 * * *")
    fun checkExpiringVouchers() {
        logger.info("Starting daily voucher expiry check...")

        val today = LocalDate.now()
        val oneMonthFromNow = today.plusMonths(1)

        val expiringVouchers = voucherRepository.findByBalanceGreaterThan(0.0)
            .filter { it.expiryDate.isAfter(today.minusDays(1)) && it.expiryDate.isBefore(oneMonthFromNow) }

        if (expiringVouchers.isNotEmpty()) {
            val messageBody = buildExpiryMessage(expiringVouchers, today)
            sendWhatsappNotification(messageBody)
        } else {
            logger.info("No vouchers expiring in the next month.")
        }
    }

    private fun buildExpiryMessage(vouchers: List<Voucher>, today: LocalDate): String {
        val header = "⚠️ *תזכורת: שוברים פוקעים בקרוב* ⚠️\n\n"
        val list = vouchers.joinToString("\n") {
            val daysLeft = ChronoUnit.DAYS.between(today, it.expiryDate)
            "• *${it.provider}* (₪${it.balance}) - פוקע בעוד $daysLeft ימים"
        }
        return header + list
    }

    private fun sendWhatsappNotification(content: String) {
        try {
            Twilio.init(accountsId, authToken)
            Message.creator(
                PhoneNumber("whatsapp:$recipientNumber"),
                PhoneNumber("whatsapp:$fromNumber"),
                content
            ).create()
                logger.info("Expiry notification sent successfully")
        } catch (e: Exception) {
            logger.error("Failed to send expiry notification: ${e.message}")
        }

    }
}