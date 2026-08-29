/** Jump to the inbox tab and open a thread (works across tab navigators). */
export function navigateToChatThread(
  navigation: { navigate: (name: string, params?: object) => void },
  contactId: string,
  inboxTab: 'Inbox' | 'PInbox' = 'Inbox'
) {
  navigation.navigate(inboxTab, {
    screen: 'ChatThreadScreen',
    params: { contactId },
  });
}
