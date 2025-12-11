# Clerk JWT Template Setup

To ensure the application correctly identifies User Roles (especially Super Admin) and redirects them properly, you must configure the **JWT Session Token** in your Clerk Dashboard.

## Instructions

1.  **Log in to Clerk Dashboard**: Go to [dashboard.clerk.com](https://dashboard.clerk.com).
2.  Select your application (e.g., **Beloop Restaurant**).
3.  In the sidebar, go to **Configure** -> **Sessions**.
4.  Find the **Customize Session Token** section and click **Edit**.
5.  In the JSON editor, add the `metadata` claim to map the user's public metadata. Your configuration should look like this:

```json
{
  "metadata": "{{user.public_metadata}}",
  "org_id": "{{org.id}}",
  "org_slug": "{{org.slug}}",
  "email": "{{user.primary_email_address}}"
}
```

6.  **Save** the changes.

## Why is this necessary?

The application's `middleware.ts` reads the `metadata.role` from the session token to determine if a user is a **SUPER** admin.
*   **Without this config**: The `role` is undefined in the edge middleware.
*   **Result**: The middleware defaults to treating the user as a regular Organzation member, redirecting them to the Brand Dashboard instead of the Super Admin Command Center.

## After Saving

1.  **Sign Out** of the application.
2.  **Sign In** again.
3.  You should now be redirected straight to the Super Admin Dashboard.
