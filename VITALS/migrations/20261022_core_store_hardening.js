module.exports = {
  async up(db) {
    await db.collection('documents').createIndex({ tenantId: 1, ownerEntity: 1, ownerId: 1, documentType: 1, isDeleted: 1 });
    await db.collection('documents').createIndex({ tenantId: 1, checksum: 1 }, { sparse: true });
    await db.collection('imagingmetadata').createIndex({ tenantId: 1, patientId: 1, caseId: 1, qualityStatus: 1 });
    await db.collection('patients').createIndex({ tenantId: 1, status: 1, createdAt: -1 });
    await db.collection('cases').createIndex({ patientId: 1, status: 1, createdAt: -1 });
  },

  async down(db) {
    await db.collection('documents').dropIndex('tenantId_1_ownerEntity_1_ownerId_1_documentType_1_isDeleted_1');
    await db.collection('documents').dropIndex('tenantId_1_checksum_1');
    await db.collection('imagingmetadata').dropIndex('tenantId_1_patientId_1_caseId_1_qualityStatus_1');
  }
};
