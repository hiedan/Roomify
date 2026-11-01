/** Success: { success: true, data } */
function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

/** Paginated list: { success: true, data: [...], pagination: { page, limit, total } } */
function sendPaginated(res, data, pagination) {
  return res.status(200).json({ success: true, data, error: null, pagination });
}

module.exports = { sendSuccess, sendPaginated };
