using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Linq;
using System.IO;
using System;

namespace REVORA_MVC_FE.Controllers
{
    [ApiController]
    public class ProxyController : ControllerBase
    {
        private static readonly HttpClient _httpClient;

        static ProxyController()
        {
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true
            };
            _httpClient = new HttpClient(handler)
            {
                BaseAddress = new Uri("https://localhost:7015/api/v1/"),
                Timeout = System.Threading.Timeout.InfiniteTimeSpan
            };
        }

        [Route("api-proxy/{**catchAll}")]
        public async Task<IActionResult> HandleProxy(string catchAll)
        {
            try
            {
                var requestMessage = new HttpRequestMessage();
                requestMessage.Version = new Version(1, 1);
                var requestMethod = Request.Method;
                
                if (HttpMethods.IsGet(requestMethod)) requestMessage.Method = HttpMethod.Get;
                else if (HttpMethods.IsPost(requestMethod)) requestMessage.Method = HttpMethod.Post;
                else if (HttpMethods.IsPut(requestMethod)) requestMessage.Method = HttpMethod.Put;
                else if (HttpMethods.IsDelete(requestMethod)) requestMessage.Method = HttpMethod.Delete;
                else if (HttpMethods.IsPatch(requestMethod)) requestMessage.Method = HttpMethod.Patch;
                else requestMessage.Method = new HttpMethod(requestMethod);

                // Construct the target URI based on the configured BaseAddress
                Uri targetUri;
                if (catchAll.StartsWith("chathub", StringComparison.OrdinalIgnoreCase))
                {
                    targetUri = new Uri("https://localhost:7015/" + catchAll + Request.QueryString.Value);
                }
                else
                {
                    targetUri = new Uri(_httpClient.BaseAddress, catchAll + Request.QueryString.Value);
                }
                requestMessage.RequestUri = targetUri;

                // Copy Body if not GET or DELETE
                if (!HttpMethods.IsGet(requestMethod) && !HttpMethods.IsDelete(requestMethod))
                {
                    var ms = new MemoryStream();
                    await Request.Body.CopyToAsync(ms, HttpContext.RequestAborted);
                    ms.Position = 0;
                    
                    var streamContent = new StreamContent(ms);
                    requestMessage.Content = streamContent;
                    
                    if (!string.IsNullOrEmpty(Request.ContentType))
                    {
                        requestMessage.Content.Headers.TryAddWithoutValidation("Content-Type", Request.ContentType);
                    }

                    if (Request.ContentLength.HasValue || ms.Length > 0)
                    {
                        requestMessage.Content.Headers.ContentLength = ms.Length;
                    }
                }

                // Restricted headers that should not be manually copied
                var restrictedHeaders = new[] { "Host", "Connection", "Transfer-Encoding", "Keep-Alive", "Content-Length", "Content-Type" };

                // Copy Headers
                foreach (var header in Request.Headers)
                {
                    if (restrictedHeaders.Contains(header.Key, StringComparer.OrdinalIgnoreCase)) continue;

                    if (!requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        requestMessage.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                var responseMessage = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, HttpContext.RequestAborted);

                var response = Response;
                response.StatusCode = (int)responseMessage.StatusCode;

                foreach (var header in responseMessage.Headers)
                {
                    response.Headers[header.Key] = header.Value.ToArray();
                }

                foreach (var header in responseMessage.Content.Headers)
                {
                    response.Headers[header.Key] = header.Value.ToArray();
                }

                response.Headers.Remove("transfer-encoding");

                await responseMessage.Content.CopyToAsync(response.Body, HttpContext.RequestAborted);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                System.IO.File.WriteAllText("error_proxy.txt", ex.ToString());
                return StatusCode(500, new { success = false, message = ex.Message, stack = ex.ToString() });
            }
        }
    }
}
