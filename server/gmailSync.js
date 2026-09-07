// Real-Time Gmail Sync & Delivery Manager

class GmailSyncManager {
  constructor() {
    this.syncedAccounts = new Map()
    this.pendingNotifications = new Map()
  }

  // Register or update a synced Gmail account
  registerGmailAccount(userData) {
    if (!userData || !userData.email) return null

    const email = userData.email.toLowerCase()
    const record = {
      uid: userData.uid,
      displayName: userData.displayName || email.split('@')[0],
      email,
      isGmail: email.endsWith('@gmail.com') || email.includes('@googlemail.com') || !!userData.isGoogleAuth,
      syncedAt: new Date().toISOString(),
      inboxStatus: 'synced',
      publicKey: userData.publicKey || null,
      photoURL: userData.photoURL || null
    }

    this.syncedAccounts.set(userData.uid, record)
    return record
  }

  getAccount(uid) {
    return this.syncedAccounts.get(uid)
  }

  findAccountByEmail(email) {
    if (!email) return null
    const normalized = email.trim().toLowerCase()
    for (const acc of this.syncedAccounts.values()) {
      if (acc.email === normalized) return acc
    }
    return null
  }

  // Simulate instant Gmail dispatch/receipt for offline or asynchronous delivery
  dispatchGmailAlert(recipientUid, senderName, messagePreview) {
    const acc = this.syncedAccounts.get(recipientUid)
    if (!acc) return null

    const alert = {
      id: 'g_sync_' + Math.random().toString(36).substring(2, 9),
      recipientEmail: acc.email,
      senderName,
      preview: messagePreview,
      sentAt: new Date().toISOString(),
      status: 'delivered_to_gmail_inbox'
    }

    if (!this.pendingNotifications.has(recipientUid)) {
      this.pendingNotifications.set(recipientUid, [])
    }
    this.pendingNotifications.get(recipientUid).push(alert)
    return alert
  }

  getPendingAlerts(recipientUid) {
    return this.pendingNotifications.get(recipientUid) || []
  }

  clearAlerts(recipientUid) {
    this.pendingNotifications.delete(recipientUid)
  }
}

export const gmailSync = new GmailSyncManager()
