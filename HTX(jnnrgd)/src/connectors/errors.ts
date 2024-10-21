export class WebSocketConnectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WebSocketError';
    }
}

export class SubscriptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SubscriptionError';
    }
}

export class MessageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MessageError';
    }
}

export class WebsocketFeedError extends Error {
    constructor() {
        super('WebSocket feed is not defined');
        this.name = 'WebsocketFeedError';
    }
}

export class WebsocketNotReadyError extends Error {
    constructor(state: number) {
        super('WebSocket is not ready, current state: ' + state);
        this.name = 'WebsocketNotReadyError';
    }
}

export class AccountNotFoundError extends Error {
    constructor() {
        super('Spot Account not found');
        this.name = 'NoAccountError';
    }
}

export class CredentialsError extends Error {
    constructor() {
        super('No credentials provided');
        this.name = 'CredentialsError';
    }
}