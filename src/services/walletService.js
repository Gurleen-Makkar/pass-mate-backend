const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');

class WalletService {
    constructor() {
        this.issuerId = '3388000000022958589';
        this.classId = `${this.issuerId}.receipt`;
        this.baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

        // Initialize Google Auth client
        this.initializeAuth();
    }

    initializeAuth() {
        try {
            // Check if credentials are available via environment variable
            if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                console.warn('⚠️ Google Application Credentials not found. Wallet passes will be disabled.');
                this.httpClient = null;
                this.credentials = null;
                return;
            }

            this.credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

            this.httpClient = new GoogleAuth({
                credentials: this.credentials,
                scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
            });

            console.log('✅ Google Wallet service initialized successfully');
        } catch (error) {
            console.warn('⚠️ Failed to initialize Google Wallet service:', error.message);
            this.httpClient = null;
            this.credentials = null;
        }
    }

    async createPassClass() {
        if (!this.httpClient) {
            console.log('⚠️ Google Wallet not configured - skipping pass class creation');
            return false;
        }

        let genericClass = {
            'id': `${this.classId}`,
            "classTemplateInfo": {
                "cardTemplateOverride": {
                    "cardRowTemplateInfos": [
                        {
                            "twoItems": {

                                "startItem": {
                                    "firstValue": {
                                        "fields": [
                                            {
                                                "fieldPath": "object.textModulesData['amount']"
                                            }
                                        ]
                                    }
                                },

                                "endItem": {
                                    "firstValue": {
                                        "fields": [
                                            {
                                                "fieldPath": "object.textModulesData['currency']"
                                            }
                                        ]
                                    }
                                }

                            }
                        }
                    ]
                }
            }
        };

        try {
            // Check if the class exists
            await this.httpClient.request({
                url: `${this.baseUrl}/genericClass/${this.classId}`,
                method: 'GET'
            });
            console.log('📱 Pass class already exists');
            return true;
        } catch (err) {
            if (err.response && err.response.status === 404) {
                try {
                    // Create the class
                    const response = await this.httpClient.request({
                        url: `${this.baseUrl}/genericClass`,
                        method: 'POST',
                        data: genericClass
                    });
                    console.log('✅ Pass class created:', response.data);
                    return true;
                } catch (createError) {
                    console.error('❌ Error creating pass class:', createError.message);
                    return false;
                }
            } else {
                console.error('❌ Pass class error:', err.message);
                return false;
            }
        }
    }

    async createPassObject(transactionData, userId) {
        if (!this.httpClient || !this.credentials) {
            console.log('⚠️ Google Wallet not configured - skipping pass creation');
            return null;
        }

        try {
            // Create pass class first
            const classCreated = await this.createPassClass();
            if (!classCreated) {
                throw new Error('Failed to create or verify pass class');
            }

            // Generate unique object ID using user email or ID + timestamp
            let objectSuffix = `${userId.replace(/[^\w.-]/g, '_')}_${Date.now()}`;
            let objectId = `${this.issuerId}.${objectSuffix}`;

            // Create generic object with receipt data
            let genericObject = {
                'id': `${objectId}`,
                'classId': this.classId,
                "logo": {
                    "sourceUri": {
                        "uri": "https://media.istockphoto.com/id/1148591344/vector/dollar-money-icon-cash-sign-bill-symbol-flat-payment-dollar-currency-icon.jpg?s=170667a&w=0&k=20&c=h_-dSSo23MkWrokQFo48dv0EMox4fVWbZBLJNpnXRYw="
                    },
                    "contentDescription": {
                        "defaultValue": {
                            "language": "en-US",
                            "value": "Receipt Logo"
                        }
                    }
                },
                "cardTitle": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": "Receipt"
                    }
                },
                "subheader": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": transactionData.category || "Purchase"
                    }
                },
                "header": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": transactionData.merchant || "Unknown Merchant"
                    }
                },
                "textModulesData": [
                    {
                        "id": "amount",
                        "header": "Amount",
                        "body": `${transactionData.currency || 'INR'} ${transactionData.amount || '0.00'}`
                    },
                    {
                        "id": "date",
                        "header": "Date",
                        "body": new Date(transactionData.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }
                ],
                "hexBackgroundColor": "#ffa8c2"
            };

            // Add items if available
            if (transactionData.items && transactionData.items.length > 0) {
                const itemsText = transactionData.items
                    .slice(0, 3) // Show max 3 items
                    .map(item => `${item.name || item}`)
                    .join(', ');

                genericObject.textModulesData.push({
                    "id": "items",
                    "header": "Items",
                    "body": itemsText + (transactionData.items.length > 3 ? '...' : '')
                });
            }

            // Check if object exists, update if it does, create if not
            try {
                await this.httpClient.request({
                    url: `${this.baseUrl}/genericObject/${objectId}`,
                    method: 'GET'
                });

                console.log('📱 Pass object exists. Updating...');
                await this.httpClient.request({
                    url: `${this.baseUrl}/genericObject/${objectId}`,
                    method: 'PATCH',
                    data: genericObject
                });
                console.log('✅ Pass object updated');
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.log('📱 Pass object does not exist. Creating new...');
                    await this.httpClient.request({
                        url: `${this.baseUrl}/genericObject`,
                        method: 'POST',
                        data: genericObject
                    });
                    console.log('✅ Pass object created');
                } else {
                    throw err;
                }
            }

            // Generate JWT with current object
            const claims = {
                iss: this.credentials.client_email,
                aud: 'google',
                origins: [],
                typ: 'savetowallet',
                payload: {
                    genericObjects: [genericObject]
                }
            };

            const token = jwt.sign(claims, this.credentials.private_key, { algorithm: 'RS256' });
            const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

            console.log('✅ Google Wallet pass created successfully');

            return {
                objectId: objectId,
                saveUrl: saveUrl,
                token: token
            };

        } catch (error) {
            console.error('❌ Error creating wallet pass:', error.message);
            throw new Error(`Failed to create wallet pass: ${error.message}`);
        }
    }

    isConfigured() {
        return this.httpClient !== null && this.credentials !== null;
    }
}

module.exports = new WalletService();
