export const PKPrefix = {
    USER: 'USER#',
    PROFILE: 'PROFILE#',
    HOUSE: 'HOUSE#',
    ITEM: 'ITEM#'
};


export const EventType = {
    USER_PROFILE_CREATE: 'USER_PROFILE_CREATE',
    USER_PROFILE_UPDATE: 'USER_PROFILE_UPDATE',
    HOUSE_ADD_UPDATE: 'HOUSE_ADD_UPDATE',
    CREATE_ITEM: 'CREATE_ITEM',
    ADD_ITEM: 'ADD_ITEM',
    REMOVE_ITEM: 'REMOVE_ITEM',
    UPDATE_ITEM: 'UPDATE_ITEM',
    DELETE_ITEM: 'DELETE_ITEM'
};

export const isValidEventType = (eventName) => {
    return Object.values(EventType).includes(eventName);
};

export const isValidPKPrefix = (pkPrefix) => {
    return Object.values(PKPrefix).includes(pkPrefix);
};