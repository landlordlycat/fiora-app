import produce from 'immer';
import deepmerge from 'deepmerge';
import {
    State,
    ActionTypes,
    ConnectActionType,
    LogoutActionType,
    SetUserActionType,
    SetGuestActionType,
    UpdateUserPropertyActionType,
    SetLinkmanMessagesActionType,
    SetFocusActionType,
    SetFriendActionType,
    Friend,
    AddLinkmanActionType,
    RemoveLinkmanActionType,
    AddlinkmanMessageActionType,
    AddLinkmanHistoryMessagesActionType,
    UpdateSelfMessageActionType,
    UpdateUIPropertyActionType,
    Group,
    UpdateGroupPropertyActionType,
    UpdateFriendPropertyActionType,
    DeleteLinkmanMessageActionType,
    User,
    Linkman,
} from '../types/redux';
import convertMessage from '../utils/convertMessage';

export function mergeLinkmans(linkmans1: Linkman[], linkmans2: Linkman[]) {
    const linkmansMap2 = linkmans2.reduce((map: { [key: string]: Linkman }, linkman) => {
        map[linkman._id] = linkman;
        return map;
    }, {});
    const unionListingsIdSet = new Set(
        linkmans1.map((linkman) => linkman._id).filter((linkmanId) => !!linkmansMap2[linkmanId]),
    );

    const linkmans = [
        ...linkmans1.filter((linkman) => unionListingsIdSet.has(linkman._id)),
        ...linkmans2.filter((linkman) => !unionListingsIdSet.has(linkman._id)),
    ];
    return linkmans.map((linkman) => {
        if (unionListingsIdSet.has(linkman._id)) {
            return deepmerge(linkman as any, linkmansMap2[linkman._id] as any, {
                customMerge: (key) => {
                    if (key === 'messages') {
                        // The new linkman data at this time does not have messages
                        // So keep the old messages
                        return () => linkman.messages;
                    }
                },
            });
        }
        return linkman;
    });
}

const initialState = {
    user: null,
    focus: '',
    connect: true,
    ui: {
        loading: '', // 全局loading文本内容, 为空则不展示
        primaryColor: '5,159,149',
        primaryTextColor: '255, 255, 255',
    },
};

const reducer = produce((state: State, action: ActionTypes) => {
    switch (action.type) {
        case ConnectActionType: {
            state.connect = action.value;
            return state;
        }
        case LogoutActionType: {
            return initialState;
        }
        case SetUserActionType: {
            const currentUserId = (state.user as User)?._id;
            if (!currentUserId || currentUserId !== action.user._id) {
                // No user or guest user or different user
                state.user = action.user;
            } else {
                // Same user. Deep merge to reserve history messages;
                // But these history messages must be overwritten in SetLinkmanMessagesAction
                // Otherwise, there may be errors when fetch history messages later
                state.user = deepmerge(state.user as User, action.user, {
                    customMerge: (key) => {
                        if (key === 'linkmans') {
                            return mergeLinkmans;
                        }
                    },
                });
            }
            return state;
        }
        case SetGuestActionType: {
            action.linkmans.forEach((linkman) => {
                linkman.messages.forEach(convertMessage);
            });
            state.user = {
                linkmans: action.linkmans,
            };
            return state;
        }
        case UpdateUserPropertyActionType: {
            // @ts-ignore
            state!.user[action.key] = action.value;
            return state;
        }
        case SetLinkmanMessagesActionType: {
            state.user!.linkmans.forEach((linkman) => {
                linkman.messages = action.messages[linkman._id].map(convertMessage);
            });
            state.user!.linkmans.sort((linkman1, linkman2) => {
                const lastMessageTime1 =
                    linkman1.messages.length > 0
                        ? linkman1.messages[linkman1.messages.length - 1].createTime
                        : linkman1.createTime;
                const lastMessageTime2 =
                    linkman2.messages.length > 0
                        ? linkman2.messages[linkman2.messages.length - 1].createTime
                        : linkman2.createTime;
                return new Date(lastMessageTime1) < new Date(lastMessageTime2) ? 1 : -1;
            });
            if (
                !state.focus ||
                !state.user!.linkmans.find((linkman) => linkman._id === state.focus)
            ) {
                state.focus = state.user!.linkmans.length > 0 ? state.user!.linkmans[0]._id : '';
            }
            return state;
        }
        case UpdateGroupPropertyActionType: {
            const group = state.user!.linkmans.find(
                (linkman) => linkman.type === 'group' && linkman._id === action.groupId,
            ) as Group;
            if (group) {
                // @ts-ignore
                group[action.key] = action.value;
            }
            return state;
        }
        case UpdateFriendPropertyActionType: {
            const friend = state.user!.linkmans.find(
                (linkman) => linkman.type !== 'group' && linkman._id === action.userId,
            ) as Friend;
            if (friend) {
                // @ts-ignore
                friend[action.key] = action.value;
            }
            return state;
        }
        case SetFocusActionType: {
            const targetLinkman = state.user!.linkmans.find(
                (linkman) => linkman._id === action.linkmanId,
            );
            if (targetLinkman) {
                state.focus = action.linkmanId;
                targetLinkman.unread = 0;
            }
            return state;
        }
        case SetFriendActionType: {
            const friend = state.user!.linkmans.find(
                (linkman) => linkman._id === action.linkmanId,
            ) as Friend;
            if (friend) {
                friend.type = 'friend';
                friend.from = action.from;
                friend.to = action.to;
                friend.unread = 0;
                state.focus = action.linkmanId;
            }
            return state;
        }
        case AddLinkmanActionType: {
            state.user!.linkmans.unshift(action.linkman);
            if (action.focus) {
                state.focus = action.linkman._id;
            }
            return state;
        }
        case RemoveLinkmanActionType: {
            const index = state.user!.linkmans.findIndex(
                (linkman) => linkman._id === action.linkmanId,
            );
            if (index !== -1) {
                state.user!.linkmans.splice(index, 1);
                if (state.focus === action.linkmanId) {
                    state.focus =
                        state.user!.linkmans.length > 0 ? state.user!.linkmans[0]._id : '';
                }
            }
            return state;
        }
        case AddlinkmanMessageActionType: {
            const targetLinkman = state.user!.linkmans.find(
                (linkman) => linkman._id === action.linkmanId,
            );
            if (targetLinkman) {
                if (state.focus !== targetLinkman._id) {
                    targetLinkman.unread += 1;
                }
                targetLinkman.messages.push(convertMessage(action.message));
                if (targetLinkman.messages.length > 500) {
                    targetLinkman.messages.slice(250);
                }
            }
            return state;
        }
        case AddLinkmanHistoryMessagesActionType: {
            const targetLinkman = state.user!.linkmans.find(
                (linkman) => linkman._id === action.linkmanId,
            );
            if (targetLinkman) {
                targetLinkman.messages.unshift(...action.messages.map(convertMessage));
            }
            return state;
        }
        case UpdateSelfMessageActionType: {
            const targetLinkman = state.user!.linkmans.find(
                (linkman) => linkman._id === action.linkmanId,
            );
            if (targetLinkman) {
                const targetMessage = targetLinkman.messages.find(
                    (message) => message._id === action.messageId,
                );
                if (targetMessage) {
                    Object.assign(targetMessage, convertMessage(action.message));
                }
            }
            return state;
        }
        case DeleteLinkmanMessageActionType: {
            const targetLinkman = state.user!.linkmans.find(
                (linkman) => linkman._id === action.linkmanId,
            );
            if (targetLinkman) {
                const targetMessageIndex = targetLinkman.messages.findIndex(
                    (message) => message._id === action.messageId,
                );
                if (targetMessageIndex !== -1) {
                    targetLinkman.messages.splice(targetMessageIndex, 1);
                }
            }
            return state;
        }
        case UpdateUIPropertyActionType: {
            state.ui[action.key] = action.value;
            return state;
        }
        default: {
            return state;
        }
    }
}, initialState);

export default reducer;
