// The hidden chat: the people list, or one open conversation.
import { useChat } from './useChat';
import { People } from './screens/People';
import { Conversation } from './screens/Conversation';

type Props = { onLock: () => void; newUsername: string | null };

export default function Chat({ onLock, newUsername }: Props) {
  const chat = useChat(newUsername);
  return chat.peer ? <Conversation chat={chat} onLock={onLock} /> : <People chat={chat} onLock={onLock} />;
}
