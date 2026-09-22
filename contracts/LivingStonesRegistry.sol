// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LivingStonesRegistry {
    enum SealType { Receipt, Finance }
    struct Seal { bytes32 merkleRoot; bytes32 linkedReceiptRoot; SealType sealType; uint64 timestamp; address sealer; }
    mapping(bytes32 => Seal[]) private serviceSeals;
    event BatchSealed(bytes32 indexed serviceId, uint256 indexed sequence, SealType sealType, bytes32 merkleRoot, bytes32 linkedReceiptRoot, address sealer);

    function seal(bytes32 serviceId, SealType sealType, bytes32 merkleRoot, bytes32 linkedReceiptRoot) external {
        require(merkleRoot != bytes32(0), "Empty root");
        if (sealType == SealType.Finance) require(linkedReceiptRoot != bytes32(0), "Finance seal must link receipt root");
        serviceSeals[serviceId].push(Seal(merkleRoot, linkedReceiptRoot, sealType, uint64(block.timestamp), msg.sender));
        emit BatchSealed(serviceId, serviceSeals[serviceId].length - 1, sealType, merkleRoot, linkedReceiptRoot, msg.sender);
    }

    function getSeal(bytes32 serviceId, uint256 sequence) external view returns (Seal memory) { return serviceSeals[serviceId][sequence]; }
    function sealCount(bytes32 serviceId) external view returns (uint256) { return serviceSeals[serviceId].length; }
}
