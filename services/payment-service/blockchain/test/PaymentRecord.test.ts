import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaymentRecord", function () {
    let paymentRecord: any; // Type will be available after compilation
    let owner: any;
    let otherAccount: any;

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();

        const PaymentRecordFactory = await ethers.getContractFactory(
            "PaymentRecord"
        );
        paymentRecord = await PaymentRecordFactory.deploy();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await paymentRecord.owner()).to.equal(owner.address);
        });

        it("Should start with zero payments", async function () {
            expect(await paymentRecord.getPaymentCount()).to.equal(0);
        });
    });

    describe("Recording Payments", function () {
        it("Should record a payment successfully", async function () {
            const paymentId = "PAY-001";
            const orderId = "user-123";
            const amount = 500; // $5.00 in cents
            const currency = "USD";

            await expect(
                paymentRecord.recordPayment(
                    paymentId,
                    orderId,
                    amount,
                    currency
                )
            ).to.emit(paymentRecord, "PaymentRecorded");

            const payment = await paymentRecord.getPayment(paymentId);
            expect(payment.paymentId).to.equal(paymentId);
            expect(payment.orderId).to.equal(orderId);
            expect(payment.amount).to.equal(amount);
            expect(payment.currency).to.equal(currency);
            expect(payment.exists).to.be.true;
        });

        it("Should prevent duplicate payments", async function () {
            const paymentId = "PAY-001";

            await paymentRecord.recordPayment(
                paymentId,
                "user-123",
                500,
                "USD"
            );

            await expect(
                paymentRecord.recordPayment(paymentId, "user-456", 1000, "USD")
            ).to.be.revertedWith("Payment already recorded");
        });

        it("Should only allow owner to record payments", async function () {
            await expect(
                paymentRecord
                    .connect(otherAccount)
                    .recordPayment("PAY-001", "user-123", 500, "USD")
            ).to.be.revertedWith("Only owner can call this function");
        });

        it("Should increment payment count", async function () {
            await paymentRecord.recordPayment(
                "PAY-001",
                "user-123",
                500,
                "USD"
            );
            await paymentRecord.recordPayment(
                "PAY-002",
                "user-456",
                300,
                "USD"
            );

            expect(await paymentRecord.getPaymentCount()).to.equal(2);
        });
    });

    describe("Verifying Payments", function () {
        it("Should verify existing payment", async function () {
            await paymentRecord.recordPayment(
                "PAY-001",
                "user-123",
                500,
                "USD"
            );
            expect(await paymentRecord.verifyPayment("PAY-001")).to.be.true;
        });

        it("Should return false for non-existent payment", async function () {
            expect(await paymentRecord.verifyPayment("FAKE-ID")).to.be.false;
        });
    });

    describe("Ownership", function () {
        it("Should transfer ownership", async function () {
            await paymentRecord.transferOwnership(otherAccount.address);
            expect(await paymentRecord.owner()).to.equal(otherAccount.address);
        });

        it("Should prevent non-owner from transferring ownership", async function () {
            await expect(
                paymentRecord
                    .connect(otherAccount)
                    .transferOwnership(otherAccount.address)
            ).to.be.revertedWith("Only owner can call this function");
        });
    });
});
