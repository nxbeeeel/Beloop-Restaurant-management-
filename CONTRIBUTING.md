# Developer Workflow

## Branch Strategy

```
main (production) ← deployed to Vercel
  └── develop (staging) ← testing ground
       └── feature/xyz ← new features
```

## Workflow Rules

### 1. New Feature Development
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
# ... develop ...
git push origin feature/your-feature-name
# Create PR → develop
```

### 2. Feature Flags
- Add new feature flag in `lib/features.ts` set to `false`
- Develop behind the flag
- Test thoroughly on develop
- Enable flag when ready

### 3. Release to Production
```bash
git checkout main
git merge develop
git tag v1.x.x
git push origin main --tags
```

### 4. Hotfix (Critical Bug)
```bash
git checkout main
git checkout -b hotfix/fix-name
# ... fix ...
git push origin hotfix/fix-name
# Create PR → main (urgent)
# Then merge main → develop
```

## Code Review Checklist

Before merging any PR, verify:

- [ ] `npx tsc --noEmit` passes (0 errors)
- [ ] No console.log debugging left
- [ ] New mutations have error handling
- [ ] Frontend has loading/error states
- [ ] Feature is behind flag if not stable

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `CLERK_SECRET_KEY` | Yes | Clerk auth |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend |
| `SUPER_ADMIN_CLERK_ID` | Yes | Super Admin user ID |
| `RESEND_API_KEY` | Yes | Email service |
| `INNGEST_EVENT_KEY` | Yes | Inngest events |
| `INNGEST_SIGNING_KEY` | Yes | Inngest auth |
