# Giftstar Travel Aviation — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every user profile (`/users/{userId}`), private PII (`/users/{userId}/private/info`), booking (`/bookings/{bookingId}`), and review (`/reviews/{reviewId}`) must bind ownership strictly to `request.auth.uid` with `request.auth.token.email_verified == true`.
2. **No Self-Assigned Privilege**: Users creating `/users/{userId}` may only set `role: "traveler"`. Admin privileges are granted exclusively via `/admins/{uid}` or the verified bootstrapped admin email (`rev.pal.john@gmail.com`).
3. **PII Isolation**: Private contact records (`email`, `phone`, `homeAirport`) under `/users/{userId}/private/info` and booking PII (`customerEmail`, `customerPhone`) are readable only by the owning user or an admin.
4. **Booking Lifecycle & Terminal Lock**: Bookings must start in `status: "pending"`. Travelers cannot promote their own booking to `"confirmed"` or `"ticketed"`. Once a booking reaches `"completed"` or `"cancelled"`, non-admins cannot mutate it.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`, and `createdAt` and `userId` are immutable after creation.
6. **Bounded Strings & Arrays**: Every string enforces explicit `.size()` ceilings and every array (`highlights`) enforces `.size() <= 10`. Document IDs must match `^[a-zA-Z0-9_-]+$`.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Privilege Escalation**: Creating `/users/u1` with `{ role: "admin" }`.
2. **Role Mutation**: Updating `/users/u1` with `{ role: "admin" }`.
3. **Shadow Field Injection**: Creating `/bookings/b1` with extra ghost field `{ isComplimentary: true }`.
4. **Booking Ownership Spoof**: Creating `/bookings/b1` with `userId: "victim-uid"` while authenticated as `"attacker-uid"`.
5. **Status Shortcutting**: Creating `/bookings/b1` directly with `status: "ticketed"`.
6. **Self-Confirmation**: Traveler updating `/bookings/b1` to `status: "confirmed"`.
7. **Terminal State Bypass**: Traveler updating a `"cancelled"` booking back to `"pending"`.
8. **PII Blanket Read**: Non-owner authenticated user attempting `get` or `list` on `/users/victim/private/info` or `/bookings` without `userId == request.auth.uid`.
9. **ID Poisoning**: Creating `/bookings/invalid$id!with*spaces` or a >128 char document ID.
10. **Timestamp Spoofing**: Creating `/bookings/b1` with backdated `createdAt`.
11. **Review Rating Overflow**: Creating `/reviews/r1` with `rating: 99` or `status: "hidden"`.
12. **Unverified Admin Email Spoof**: Request with admin email token where `email_verified: false`.
