package com.myhome.shoppingbot.Controller

import jakarta.servlet.http.HttpServletRequest
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestTemplate

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val restTemplate: RestTemplate,
    @Value("\${ALLOWED_EMAILS:}") private val allowedEmailsStr: String
) {

    private val allowedEmails: Set<String> by lazy {
        allowedEmailsStr.split(",").map { it.trim() }.filter { it.isNotBlank() }.toSet()
    }

    @GetMapping("/me")
    fun me(request: HttpServletRequest): ResponseEntity<Any> {
        val session = request.getSession(false)
        val email = session?.getAttribute("email") as? String
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Not logged in"))
        return ResponseEntity.ok(mapOf(
            "email"   to email,
            "name"    to (session.getAttribute("name") as? String ?: ""),
            "picture" to (session.getAttribute("picture") as? String ?: "")
        ))
    }

    @PostMapping("/login")
    fun login(@RequestBody body: Map<String, String>, request: HttpServletRequest): ResponseEntity<Any> {
        val idToken = body["idToken"]
            ?: return ResponseEntity.badRequest().body(mapOf("error" to "Missing idToken"))

        return try {
            @Suppress("UNCHECKED_CAST")
            val tokenInfo = restTemplate.getForObject(
                "https://oauth2.googleapis.com/tokeninfo?id_token=$idToken",
                Map::class.java
            ) as? Map<String, Any>
                ?: return ResponseEntity.status(500).body(mapOf("error" to "Token verification failed"))

            val email = tokenInfo["email"] as? String
                ?: return ResponseEntity.status(401).body(mapOf("error" to "No email in token"))

            if ((tokenInfo["email_verified"] as? String) != "true")
                return ResponseEntity.status(401).body(mapOf("error" to "Email not verified"))

            if (allowedEmails.isNotEmpty() && email !in allowedEmails)
                return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))

            val session = request.getSession(true)
            session.maxInactiveInterval = 30 * 24 * 60 * 60
            session.setAttribute("email", email)
            session.setAttribute("name", tokenInfo["name"] as? String ?: "")
            session.setAttribute("picture", tokenInfo["picture"] as? String ?: "")

            ResponseEntity.ok(mapOf(
                "email"   to email,
                "name"    to (tokenInfo["name"] as? String ?: ""),
                "picture" to (tokenInfo["picture"] as? String ?: "")
            ))
        } catch (e: Exception) {
            ResponseEntity.status(401).body(mapOf("error" to "Invalid token: ${e.message}"))
        }
    }

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest): ResponseEntity<Any> {
        request.getSession(false)?.invalidate()
        return ResponseEntity.ok(mapOf("message" to "Logged out"))
    }
}

@RestController
class ConfigController(@Value("\${GOOGLE_CLIENT_ID:}") private val googleClientId: String) {
    @GetMapping("/api/config")
    fun config() = mapOf("googleClientId" to googleClientId)
}
