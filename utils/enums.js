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
    CREATE_ITEM: 'CREATE_ITEM'
};

export const isValidEventType = (eventName) => {
    return Object.values(EventType).includes(eventName);
};

export const isValidPKPrefix = (pkPrefix) => {
    return Object.values(PKPrefix).includes(pkPrefix);
};